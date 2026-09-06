import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  inventoryStockProducts,
  inventoryStockRawMaterials,
  stockLedgerProducts,
  stockLedgerRawMaterials,
} from "@/db/schema";
import { type BatchSourceType, createBatch, consumeFefo } from "@/server/lib/batches";

export type ItemType = "raw_material" | "product";

/**
 * Accepts either the top-level `db` or an in-flight `tx` — lets
 * applyStockMovement join a caller's existing transaction (production runs,
 * transfers) instead of always opening its own, which would otherwise break
 * atomicity between the ledger write and whatever else the caller is doing.
 */
export type DbExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete" | "transaction">;

export type SharedMovementType =
  | "stock_in"
  | "stock_out"
  | "adjustment_increase"
  | "adjustment_decrease"
  | "transfer_out"
  | "transfer_in"
  | "sale_deduction"
  | "waste_writeoff";

export type RawMaterialMovementType = SharedMovementType | "production_consume" | "purchase_receipt";
export type ProductMovementType = SharedMovementType | "production_yield";

class InsufficientStockError extends Error {
  constructor() {
    super("Insufficient stock for this movement");
  }
}
export { InsufficientStockError };

/** Only the raw material movement types that ever carry a positive delta. */
function inferBatchSourceType(movementType: string): BatchSourceType {
  switch (movementType) {
    case "stock_in":
    case "purchase_receipt":
    case "transfer_in":
    case "adjustment_increase":
      return movementType;
    default:
      throw new Error(`Movement type "${movementType}" has no batch source mapping for a stock increase`);
  }
}

/**
 * Applies a signed quantity change to a branch's stock for one item and
 * writes the matching append-only ledger row in the same transaction. This
 * is the single choke point every stock-affecting feature (stock in/out,
 * adjustments, transfers, production, POS deduction) goes through.
 */
export async function applyStockMovement(
  params: {
    branchId: string;
    itemType: ItemType;
    itemId: string;
    movementType: RawMaterialMovementType | ProductMovementType;
    quantityDelta: number;
    performedBy: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    /**
     * Raw materials only, and only meaningful when quantityDelta > 0: the
     * expiry date / cost to record on the new batch this increase creates.
     * Ignored for decreases (which draw FEFO from existing batches instead)
     * and for products (not batch-tracked).
     */
    batchExpiryDate?: string | null;
    batchUnitCost?: number | null;
    /**
     * Raw materials only. When a caller already knows exactly which lot(s)
     * an increase should be recorded under — a stock transfer's receiving
     * side reconstructing the expiry/cost of what was actually shipped —
     * pass them here instead of minting one generic batch.
     */
    batchOverride?: Array<{ quantity: number; expiryDate?: string | null; unitCost?: number | null }>;
  },
  executor: DbExecutor = db,
) {
  const { branchId, itemType, itemId, movementType, quantityDelta, performedBy, referenceType, referenceId, notes, batchExpiryDate, batchUnitCost, batchOverride } = params;

  return executor.transaction(async (tx) => {
    if (itemType === "raw_material") {
      // Guarantee a row exists, then lock it, so concurrent movements on the
      // same (branch, item) serialize instead of racing a read-then-write —
      // two simultaneous sales/production runs could otherwise both read the
      // same currentQty, both pass the newQty < 0 check, and both commit.
      await tx
        .insert(inventoryStockRawMaterials)
        .values({ branchId, rawMaterialId: itemId, quantity: "0" })
        .onConflictDoNothing();

      const [existing] = await tx
        .select()
        .from(inventoryStockRawMaterials)
        .where(and(eq(inventoryStockRawMaterials.branchId, branchId), eq(inventoryStockRawMaterials.rawMaterialId, itemId)))
        .limit(1)
        .for("update");

      const currentQty = Number(existing.quantity);
      const newQty = currentQty + quantityDelta;
      if (newQty < 0) throw new InsufficientStockError();

      await tx
        .update(inventoryStockRawMaterials)
        .set({ quantity: String(newQty) })
        .where(eq(inventoryStockRawMaterials.id, existing.id));

      const [ledgerRow] = await tx
        .insert(stockLedgerRawMaterials)
        .values({
          branchId,
          rawMaterialId: itemId,
          movementType,
          quantityDelta: String(quantityDelta),
          quantityAfter: String(newQty),
          referenceType,
          referenceId,
          performedBy,
          notes,
        })
        .returning();

      if (quantityDelta > 0) {
        const sourceType = inferBatchSourceType(movementType);
        if (batchOverride && batchOverride.length > 0) {
          for (const b of batchOverride) {
            if (b.quantity <= 0) continue;
            await createBatch(tx, {
              branchId,
              rawMaterialId: itemId,
              quantity: b.quantity,
              expiryDate: b.expiryDate,
              unitCost: b.unitCost,
              sourceType,
              sourceId: referenceId,
            });
          }
        } else {
          await createBatch(tx, {
            branchId,
            rawMaterialId: itemId,
            quantity: quantityDelta,
            expiryDate: batchExpiryDate,
            unitCost: batchUnitCost,
            sourceType,
            sourceId: referenceId,
          });
        }
      } else if (quantityDelta < 0) {
        await consumeFefo(tx, { branchId, rawMaterialId: itemId, quantity: -quantityDelta, stockLedgerId: ledgerRow.id });
      }

      return ledgerRow;
    }

    await tx
      .insert(inventoryStockProducts)
      .values({ branchId, productId: itemId, quantity: "0" })
      .onConflictDoNothing();

    const [existing] = await tx
      .select()
      .from(inventoryStockProducts)
      .where(and(eq(inventoryStockProducts.branchId, branchId), eq(inventoryStockProducts.productId, itemId)))
      .limit(1)
      .for("update");

    const currentQty = Number(existing.quantity);
    const newQty = currentQty + quantityDelta;
    if (newQty < 0) throw new InsufficientStockError();

    await tx.update(inventoryStockProducts).set({ quantity: String(newQty) }).where(eq(inventoryStockProducts.id, existing.id));

    const [ledgerRow] = await tx
      .insert(stockLedgerProducts)
      .values({
        branchId,
        productId: itemId,
        movementType,
        quantityDelta: String(quantityDelta),
        quantityAfter: String(newQty),
        referenceType,
        referenceId,
        performedBy,
        notes,
      })
      .returning();

    return ledgerRow;
  });
}

export async function getStockLevels(branchId: string) {
  const rawMaterialStock = await db.select().from(inventoryStockRawMaterials).where(eq(inventoryStockRawMaterials.branchId, branchId));
  const productStock = await db.select().from(inventoryStockProducts).where(eq(inventoryStockProducts.branchId, branchId));
  return { rawMaterialStock, productStock };
}

export async function getLedger(
  params: { branchId?: string; itemType: "raw_material"; limit?: number },
): Promise<(typeof stockLedgerRawMaterials.$inferSelect)[]>;
export async function getLedger(
  params: { branchId?: string; itemType: "product"; limit?: number },
): Promise<(typeof stockLedgerProducts.$inferSelect)[]>;
export async function getLedger(params: { branchId?: string; itemType: ItemType; limit?: number }) {
  const { branchId, itemType, limit = 100 } = params;

  if (itemType === "raw_material") {
    return db
      .select()
      .from(stockLedgerRawMaterials)
      .where(branchId ? eq(stockLedgerRawMaterials.branchId, branchId) : undefined)
      .orderBy(desc(stockLedgerRawMaterials.createdAt))
      .limit(limit);
  }

  return db
    .select()
    .from(stockLedgerProducts)
    .where(branchId ? eq(stockLedgerProducts.branchId, branchId) : undefined)
    .orderBy(desc(stockLedgerProducts.createdAt))
    .limit(limit);
}
