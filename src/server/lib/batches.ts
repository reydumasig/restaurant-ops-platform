import { and, asc, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { rawMaterialBatchAllocations, rawMaterialBatches } from "@/db/schema";
import type { DbExecutor } from "@/server/lib/inventory";

export type BatchSourceType = "stock_in" | "purchase_receipt" | "transfer_in" | "adjustment_increase" | "legacy_balance";

function generateBatchNumber() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BAT-${stamp}-${random}`;
}

export class InsufficientBatchStockError extends Error {
  constructor() {
    super("Batch records don't cover the requested quantity — batch and aggregate stock have drifted out of sync");
  }
}

export async function createBatch(
  tx: DbExecutor,
  params: {
    branchId: string;
    rawMaterialId: string;
    quantity: number;
    expiryDate?: string | null;
    unitCost?: number | null;
    sourceType: BatchSourceType;
    sourceId?: string;
  },
) {
  const { branchId, rawMaterialId, quantity, expiryDate, unitCost, sourceType, sourceId } = params;

  const [batch] = await tx
    .insert(rawMaterialBatches)
    .values({
      batchNumber: generateBatchNumber(),
      branchId,
      rawMaterialId,
      expiryDate: expiryDate ?? null,
      quantityReceived: String(quantity),
      quantityRemaining: String(quantity),
      unitCost: unitCost != null ? String(unitCost) : null,
      sourceType,
      sourceId,
    })
    .returning();

  return batch;
}

/**
 * Draws down `quantity` across the branch's raw material batches in
 * First-Expired-First-Out order (batches with a known expiry date, soonest
 * first; batches with no expiry drawn last, oldest received first),
 * recording an append-only allocation row per batch touched so consumption
 * is traceable back to exactly which lot(s) it came from — this is what
 * lets a transfer's receiving side reconstruct the original expiry date.
 */
export async function consumeFefo(
  tx: DbExecutor,
  params: { branchId: string; rawMaterialId: string; quantity: number; stockLedgerId: string },
) {
  const { branchId, rawMaterialId, quantity, stockLedgerId } = params;

  const batches = await tx
    .select()
    .from(rawMaterialBatches)
    .where(
      and(
        eq(rawMaterialBatches.branchId, branchId),
        eq(rawMaterialBatches.rawMaterialId, rawMaterialId),
        gt(rawMaterialBatches.quantityRemaining, "0"),
      ),
    )
    .orderBy(
      sql`${rawMaterialBatches.expiryDate} is null`,
      asc(rawMaterialBatches.expiryDate),
      asc(rawMaterialBatches.receivedDate),
      asc(rawMaterialBatches.createdAt),
    )
    .for("update");

  let remainingToConsume = quantity;
  const allocations: Array<{ batchId: string; quantity: number; expiryDate: string | null; unitCost: string | null }> = [];

  for (const batch of batches) {
    if (remainingToConsume <= 0) break;
    const available = Number(batch.quantityRemaining);
    const draw = Math.min(available, remainingToConsume);
    if (draw <= 0) continue;

    await tx
      .update(rawMaterialBatches)
      .set({ quantityRemaining: String(available - draw) })
      .where(eq(rawMaterialBatches.id, batch.id));

    await tx.insert(rawMaterialBatchAllocations).values({
      batchId: batch.id,
      stockLedgerId,
      quantity: String(draw),
    });

    allocations.push({ batchId: batch.id, quantity: draw, expiryDate: batch.expiryDate, unitCost: batch.unitCost });
    remainingToConsume -= draw;
  }

  if (remainingToConsume > 1e-9) throw new InsufficientBatchStockError();

  return allocations;
}

export async function getBatchAllocationsForLedger(stockLedgerId: string) {
  return db
    .select({
      batchId: rawMaterialBatchAllocations.batchId,
      quantity: rawMaterialBatchAllocations.quantity,
      expiryDate: rawMaterialBatches.expiryDate,
      unitCost: rawMaterialBatches.unitCost,
    })
    .from(rawMaterialBatchAllocations)
    .innerJoin(rawMaterialBatches, eq(rawMaterialBatchAllocations.batchId, rawMaterialBatches.id))
    .where(eq(rawMaterialBatchAllocations.stockLedgerId, stockLedgerId));
}

export async function getBatchesForItem(params: { branchId: string; rawMaterialId: string }) {
  return db
    .select()
    .from(rawMaterialBatches)
    .where(
      and(
        eq(rawMaterialBatches.branchId, params.branchId),
        eq(rawMaterialBatches.rawMaterialId, params.rawMaterialId),
        gt(rawMaterialBatches.quantityRemaining, "0"),
      ),
    )
    .orderBy(
      sql`${rawMaterialBatches.expiryDate} is null`,
      asc(rawMaterialBatches.expiryDate),
      asc(rawMaterialBatches.receivedDate),
      asc(rawMaterialBatches.createdAt),
    );
}

export async function getExpiringBatches(params: { branchId?: string | null; withinDays: number }) {
  const { branchId, withinDays } = params;

  return db
    .select()
    .from(rawMaterialBatches)
    .where(
      and(
        branchId ? eq(rawMaterialBatches.branchId, branchId) : undefined,
        gt(rawMaterialBatches.quantityRemaining, "0"),
        sql`${rawMaterialBatches.expiryDate} is not null`,
        lte(rawMaterialBatches.expiryDate, sql`current_date + ${withinDays}::int`),
      ),
    )
    .orderBy(asc(rawMaterialBatches.expiryDate));
}
