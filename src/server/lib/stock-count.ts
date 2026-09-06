import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryStockProducts, inventoryStockRawMaterials, stockCountItems, stockCounts } from "@/db/schema";
import { applyStockMovement, type ItemType } from "@/server/lib/inventory";

function generateCountNumber() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SC-${stamp}-${random}`;
}

export async function createStockCount(params: { branchId: string; itemType: ItemType; startedBy: string; notes?: string }) {
  const { branchId, itemType, startedBy, notes } = params;

  return db.transaction(async (tx) => {
    const [count] = await tx
      .insert(stockCounts)
      .values({ countNumber: generateCountNumber(), branchId, itemType, startedBy, notes })
      .returning();

    if (itemType === "raw_material") {
      const rows = await tx.select().from(inventoryStockRawMaterials).where(eq(inventoryStockRawMaterials.branchId, branchId));
      if (rows.length === 0) throw new Error("This branch has no raw material stock on record to count");
      for (const row of rows) {
        await tx.insert(stockCountItems).values({ stockCountId: count.id, rawMaterialId: row.rawMaterialId, expectedQuantity: row.quantity });
      }
    } else {
      const rows = await tx.select().from(inventoryStockProducts).where(eq(inventoryStockProducts.branchId, branchId));
      if (rows.length === 0) throw new Error("This branch has no product stock on record to count");
      for (const row of rows) {
        await tx.insert(stockCountItems).values({ stockCountId: count.id, productId: row.productId, expectedQuantity: row.quantity });
      }
    }

    return count;
  });
}

export async function getStockCountWithItems(id: string) {
  const [count] = await db.select().from(stockCounts).where(eq(stockCounts.id, id)).limit(1);
  if (!count) return null;
  const items = await db.select().from(stockCountItems).where(eq(stockCountItems.stockCountId, id));
  return { count, items };
}

export async function listStockCounts(branchId: string | null) {
  if (!branchId) return db.select().from(stockCounts).orderBy(desc(stockCounts.createdAt));
  return db.select().from(stockCounts).where(eq(stockCounts.branchId, branchId)).orderBy(desc(stockCounts.createdAt));
}

export type CountEntry = { id: string; countedQuantity: number };

export async function completeStockCount(params: { stockCountId: string; completedBy: string; counts: CountEntry[] }) {
  const { stockCountId, completedBy, counts } = params;

  return db.transaction(async (tx) => {
    const [count] = await tx.select().from(stockCounts).where(eq(stockCounts.id, stockCountId)).limit(1);
    if (!count) throw new Error("Stock count not found");
    if (count.status !== "in_progress") throw new Error(`Stock count is already ${count.status}`);

    for (const entry of counts) {
      const [item] = await tx.select().from(stockCountItems).where(eq(stockCountItems.id, entry.id)).limit(1);
      if (!item) throw new Error("Stock count line not found");

      await tx.update(stockCountItems).set({ countedQuantity: String(entry.countedQuantity) }).where(eq(stockCountItems.id, entry.id));

      const itemType: ItemType = item.rawMaterialId ? "raw_material" : "product";
      const itemId = item.rawMaterialId ?? item.productId!;

      // Variance is computed against the LIVE quantity at completion time, not
      // the snapshot taken when the count started — a sale or transfer that
      // legitimately happened mid-count would otherwise be misattributed as
      // shrinkage. expectedQuantity stays stored purely as a reference point
      // for what the system showed when counting began.
      const currentQty =
        itemType === "raw_material"
          ? await tx
              .select()
              .from(inventoryStockRawMaterials)
              .where(and(eq(inventoryStockRawMaterials.branchId, count.branchId), eq(inventoryStockRawMaterials.rawMaterialId, itemId)))
              .limit(1)
              .then(([row]) => Number(row?.quantity ?? 0))
          : await tx
              .select()
              .from(inventoryStockProducts)
              .where(and(eq(inventoryStockProducts.branchId, count.branchId), eq(inventoryStockProducts.productId, itemId)))
              .limit(1)
              .then(([row]) => Number(row?.quantity ?? 0));

      const variance = entry.countedQuantity - currentQty;
      if (variance === 0) continue;

      await applyStockMovement(
        {
          branchId: count.branchId,
          itemType,
          itemId,
          movementType: variance > 0 ? "adjustment_increase" : "adjustment_decrease",
          quantityDelta: variance,
          performedBy: completedBy,
          referenceType: "stock_count",
          referenceId: count.id,
          notes: `Stock count ${count.countNumber}`,
        },
        tx,
      );
    }

    const [updated] = await tx
      .update(stockCounts)
      .set({ status: "completed", completedBy, completedAt: new Date() })
      .where(eq(stockCounts.id, stockCountId))
      .returning();

    return updated;
  });
}

export async function cancelStockCount(params: { stockCountId: string }) {
  const { stockCountId } = params;

  return db.transaction(async (tx) => {
    const [count] = await tx.select().from(stockCounts).where(eq(stockCounts.id, stockCountId)).limit(1);
    if (!count) throw new Error("Stock count not found");
    if (count.status !== "in_progress") throw new Error(`Stock count is already ${count.status}`);

    const [updated] = await tx.update(stockCounts).set({ status: "cancelled" }).where(eq(stockCounts.id, stockCountId)).returning();
    return updated;
  });
}
