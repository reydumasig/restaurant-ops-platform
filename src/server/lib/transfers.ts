import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { stockLedgerRawMaterials, stockTransferItemsProducts, stockTransferItemsRawMaterials, stockTransfers } from "@/db/schema";
import { getBatchAllocationsForLedger } from "@/server/lib/batches";
import { applyStockMovement, type DbExecutor, type ItemType } from "@/server/lib/inventory";

function generateTransferNo() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TRF-${stamp}-${random}`;
}

/**
 * Reconstructs which batch(es) a raw material transfer's receiving side
 * should be recorded under, by looking up the allocations the original
 * transfer_out draw made and scaling them to the fraction actually
 * received (a partial receipt splits proportionally across whatever
 * batches were shipped). Falls back to `undefined` — applyStockMovement
 * then mints one generic no-expiry batch — when the transfer_out ledger
 * row or its allocations can't be found (shouldn't happen for a transfer
 * created after this migration, but never worth failing the receipt over).
 */
async function computeBatchOverride(
  tx: DbExecutor,
  params: { transferId: string; rawMaterialId: string; quantityReceived: number; quantitySent: number },
) {
  const { transferId, rawMaterialId, quantityReceived, quantitySent } = params;
  if (quantityReceived <= 0 || quantitySent <= 0) return undefined;

  const [outLedger] = await tx
    .select({ id: stockLedgerRawMaterials.id })
    .from(stockLedgerRawMaterials)
    .where(
      and(
        eq(stockLedgerRawMaterials.referenceType, "stock_transfer"),
        eq(stockLedgerRawMaterials.referenceId, transferId),
        eq(stockLedgerRawMaterials.rawMaterialId, rawMaterialId),
        eq(stockLedgerRawMaterials.movementType, "transfer_out"),
      ),
    )
    .limit(1);
  if (!outLedger) return undefined;

  const sourceAllocations = await getBatchAllocationsForLedger(outLedger.id);
  if (sourceAllocations.length === 0) return undefined;

  const fraction = quantityReceived / quantitySent;
  return sourceAllocations
    .map((a) => ({
      quantity: Number(a.quantity) * fraction,
      expiryDate: a.expiryDate,
      unitCost: a.unitCost != null ? Number(a.unitCost) : null,
    }))
    .filter((b) => b.quantity > 0);
}

export type TransferLineInput = { itemType: ItemType; itemId: string; quantity: number };

export async function createTransfer(params: {
  fromBranchId: string;
  toBranchId: string;
  createdBy: string;
  items: TransferLineInput[];
  notes?: string;
}) {
  const { fromBranchId, toBranchId, createdBy, items, notes } = params;
  if (items.length === 0) throw new Error("A transfer needs at least one item");

  return db.transaction(async (tx) => {
    const [transfer] = await tx
      .insert(stockTransfers)
      .values({
        transferNo: generateTransferNo(),
        fromBranchId,
        toBranchId,
        status: "in_transit",
        createdBy,
        notes,
      })
      .returning();

    for (const item of items) {
      if (item.itemType === "raw_material") {
        await tx.insert(stockTransferItemsRawMaterials).values({
          transferId: transfer.id,
          rawMaterialId: item.itemId,
          quantitySent: String(item.quantity),
        });
      } else {
        await tx.insert(stockTransferItemsProducts).values({
          transferId: transfer.id,
          productId: item.itemId,
          quantitySent: String(item.quantity),
        });
      }

      await applyStockMovement(
        {
          branchId: fromBranchId,
          itemType: item.itemType,
          itemId: item.itemId,
          movementType: "transfer_out",
          quantityDelta: -item.quantity,
          performedBy: createdBy,
          referenceType: "stock_transfer",
          referenceId: transfer.id,
        },
        tx,
      );
    }

    return transfer;
  });
}

export async function getTransferWithItems(transferId: string) {
  const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, transferId)).limit(1);
  if (!transfer) return null;

  const rawMaterialItems = await db
    .select()
    .from(stockTransferItemsRawMaterials)
    .where(eq(stockTransferItemsRawMaterials.transferId, transferId));
  const productItems = await db.select().from(stockTransferItemsProducts).where(eq(stockTransferItemsProducts.transferId, transferId));

  return { transfer, rawMaterialItems, productItems };
}

export async function confirmReceipt(params: {
  transferId: string;
  receivedBy: string;
  rawMaterialReceipts: Array<{ id: string; quantityReceived: number }>;
  productReceipts: Array<{ id: string; quantityReceived: number }>;
}) {
  const { transferId, receivedBy, rawMaterialReceipts, productReceipts } = params;

  return db.transaction(async (tx) => {
    const [transfer] = await tx.select().from(stockTransfers).where(eq(stockTransfers.id, transferId)).limit(1);
    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "in_transit") throw new Error(`Transfer is already ${transfer.status}`);

    for (const receipt of rawMaterialReceipts) {
      const [line] = await tx
        .select()
        .from(stockTransferItemsRawMaterials)
        .where(eq(stockTransferItemsRawMaterials.id, receipt.id))
        .limit(1);
      if (!line) throw new Error("Transfer line not found");
      if (receipt.quantityReceived > Number(line.quantitySent)) {
        throw new Error("Received quantity cannot exceed the quantity sent");
      }

      await tx
        .update(stockTransferItemsRawMaterials)
        .set({ quantityReceived: String(receipt.quantityReceived) })
        .where(eq(stockTransferItemsRawMaterials.id, receipt.id));

      const batchOverride = await computeBatchOverride(tx, {
        transferId: transfer.id,
        rawMaterialId: line.rawMaterialId,
        quantityReceived: receipt.quantityReceived,
        quantitySent: Number(line.quantitySent),
      });

      await applyStockMovement(
        {
          branchId: transfer.toBranchId,
          itemType: "raw_material",
          itemId: line.rawMaterialId,
          movementType: "transfer_in",
          quantityDelta: receipt.quantityReceived,
          performedBy: receivedBy,
          referenceType: "stock_transfer",
          referenceId: transfer.id,
          batchOverride,
        },
        tx,
      );
    }

    for (const receipt of productReceipts) {
      const [line] = await tx.select().from(stockTransferItemsProducts).where(eq(stockTransferItemsProducts.id, receipt.id)).limit(1);
      if (!line) throw new Error("Transfer line not found");
      if (receipt.quantityReceived > Number(line.quantitySent)) {
        throw new Error("Received quantity cannot exceed the quantity sent");
      }

      await tx
        .update(stockTransferItemsProducts)
        .set({ quantityReceived: String(receipt.quantityReceived) })
        .where(eq(stockTransferItemsProducts.id, receipt.id));

      await applyStockMovement(
        {
          branchId: transfer.toBranchId,
          itemType: "product",
          itemId: line.productId,
          movementType: "transfer_in",
          quantityDelta: receipt.quantityReceived,
          performedBy: receivedBy,
          referenceType: "stock_transfer",
          referenceId: transfer.id,
        },
        tx,
      );
    }

    const [updated] = await tx
      .update(stockTransfers)
      .set({ status: "received", receivedBy, receivedAt: new Date() })
      .where(eq(stockTransfers.id, transferId))
      .returning();

    return updated;
  });
}

export async function cancelTransfer(params: { transferId: string; cancelledBy: string }) {
  const { transferId, cancelledBy } = params;

  return db.transaction(async (tx) => {
    const [transfer] = await tx.select().from(stockTransfers).where(eq(stockTransfers.id, transferId)).limit(1);
    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "in_transit") throw new Error(`Transfer is already ${transfer.status}`);

    const rawMaterialItems = await tx
      .select()
      .from(stockTransferItemsRawMaterials)
      .where(eq(stockTransferItemsRawMaterials.transferId, transferId));
    const productItems = await tx.select().from(stockTransferItemsProducts).where(eq(stockTransferItemsProducts.transferId, transferId));

    for (const item of rawMaterialItems) {
      const batchOverride = await computeBatchOverride(tx, {
        transferId: transfer.id,
        rawMaterialId: item.rawMaterialId,
        quantityReceived: Number(item.quantitySent),
        quantitySent: Number(item.quantitySent),
      });

      await applyStockMovement(
        {
          branchId: transfer.fromBranchId,
          itemType: "raw_material",
          itemId: item.rawMaterialId,
          movementType: "transfer_in",
          quantityDelta: Number(item.quantitySent),
          performedBy: cancelledBy,
          referenceType: "stock_transfer_cancel",
          referenceId: transfer.id,
          notes: "Transfer cancelled — stock returned to source branch",
          batchOverride,
        },
        tx,
      );
    }

    for (const item of productItems) {
      await applyStockMovement(
        {
          branchId: transfer.fromBranchId,
          itemType: "product",
          itemId: item.productId,
          movementType: "transfer_in",
          quantityDelta: Number(item.quantitySent),
          performedBy: cancelledBy,
          referenceType: "stock_transfer_cancel",
          referenceId: transfer.id,
          notes: "Transfer cancelled — stock returned to source branch",
        },
        tx,
      );
    }

    const [updated] = await tx.update(stockTransfers).set({ status: "cancelled" }).where(eq(stockTransfers.id, transferId)).returning();
    return updated;
  });
}

export async function listTransfers(branchId: string | null) {
  if (!branchId) {
    return db.select().from(stockTransfers).orderBy(desc(stockTransfers.createdAt));
  }
  return db
    .select()
    .from(stockTransfers)
    .where(or(eq(stockTransfers.fromBranchId, branchId), eq(stockTransfers.toBranchId, branchId)))
    .orderBy(desc(stockTransfers.createdAt));
}
