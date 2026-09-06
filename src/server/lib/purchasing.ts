import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { purchaseOrderItems, purchaseOrders, rawMaterials, supplierPriceHistory } from "@/db/schema";
import { applyStockMovement } from "@/server/lib/inventory";

function generatePoNumber() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PO-${stamp}-${random}`;
}

export type PoLineInput = { rawMaterialId: string; quantity: number; unitCost: number };

export async function createPurchaseOrder(params: {
  supplierId: string;
  branchId: string;
  createdBy: string;
  items: PoLineInput[];
  notes?: string;
}) {
  const { supplierId, branchId, createdBy, items, notes } = params;
  if (items.length === 0) throw new Error("A purchase order needs at least one item");

  return db.transaction(async (tx) => {
    const [po] = await tx
      .insert(purchaseOrders)
      .values({ poNumber: generatePoNumber(), supplierId, branchId, status: "ordered", createdBy, notes })
      .returning();

    for (const item of items) {
      await tx.insert(purchaseOrderItems).values({
        purchaseOrderId: po.id,
        rawMaterialId: item.rawMaterialId,
        quantityOrdered: String(item.quantity),
        unitCost: String(item.unitCost),
      });
    }

    return po;
  });
}

export async function getPurchaseOrderWithItems(id: string) {
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  if (!po) return null;
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  return { po, items };
}

export async function listPurchaseOrders(branchId: string | null) {
  if (!branchId) return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  return db.select().from(purchaseOrders).where(eq(purchaseOrders.branchId, branchId)).orderBy(desc(purchaseOrders.createdAt));
}

/**
 * Average of the last `sampleSize` recorded prices for this raw material,
 * across all suppliers, taken BEFORE the price being evaluated. Used to
 * flag a receipt that looks overpriced relative to recent history — this
 * is informational only, never blocks the receipt (goods receiving in the
 * real world can't refuse a delivery just because the price moved).
 */
async function priceVarianceFlag(rawMaterialId: string, newUnitCost: number, sampleSize = 5) {
  const recent = await db
    .select({ unitCost: supplierPriceHistory.unitCost })
    .from(supplierPriceHistory)
    .where(eq(supplierPriceHistory.rawMaterialId, rawMaterialId))
    .orderBy(desc(supplierPriceHistory.recordedAt))
    .limit(sampleSize);

  if (recent.length === 0) return null;

  const average = recent.reduce((sum, r) => sum + Number(r.unitCost), 0) / recent.length;
  if (average === 0) return null;

  const percentAboveAverage = ((newUnitCost - average) / average) * 100;
  return { average, percentAboveAverage, sampleSize: recent.length };
}

export type PoReceiptInput = { id: string; quantityReceived: number; actualUnitCost?: number; expiryDate?: string };

export async function receivePurchaseOrder(params: { purchaseOrderId: string; receivedBy: string; receipts: PoReceiptInput[] }) {
  const { purchaseOrderId, receivedBy, receipts } = params;

  return db.transaction(async (tx) => {
    const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).limit(1);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "ordered") throw new Error(`Purchase order is already ${po.status}`);

    const priceWarnings: Array<{ rawMaterialId: string; unitCost: number; average: number; percentAboveAverage: number }> = [];

    for (const receipt of receipts) {
      const [line] = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, receipt.id)).limit(1);
      if (!line) throw new Error("Purchase order line not found");

      const unitCost = receipt.actualUnitCost ?? Number(line.unitCost);

      const warning = await priceVarianceFlag(line.rawMaterialId, unitCost);
      if (warning && warning.percentAboveAverage > 10) {
        priceWarnings.push({ rawMaterialId: line.rawMaterialId, unitCost, average: warning.average, percentAboveAverage: warning.percentAboveAverage });
      }

      await tx
        .update(purchaseOrderItems)
        .set({ quantityReceived: String(receipt.quantityReceived), actualUnitCost: String(unitCost) })
        .where(eq(purchaseOrderItems.id, receipt.id));

      await applyStockMovement(
        {
          branchId: po.branchId,
          itemType: "raw_material",
          itemId: line.rawMaterialId,
          movementType: "purchase_receipt",
          quantityDelta: receipt.quantityReceived,
          performedBy: receivedBy,
          referenceType: "purchase_order",
          referenceId: po.id,
          batchExpiryDate: receipt.expiryDate ?? null,
          batchUnitCost: unitCost,
        },
        tx,
      );

      await tx.insert(supplierPriceHistory).values({
        supplierId: po.supplierId,
        rawMaterialId: line.rawMaterialId,
        unitCost: String(unitCost),
        purchaseOrderId: po.id,
      });

      // Keep Master Data's cost_per_unit current with what was actually paid,
      // same principle as the client's original ask: the system should
      // reflect the latest real purchase price automatically.
      await tx.update(rawMaterials).set({ costPerUnit: String(unitCost) }).where(eq(rawMaterials.id, line.rawMaterialId));
    }

    const [updated] = await tx
      .update(purchaseOrders)
      .set({ status: "received", receivedBy, receivedAt: new Date() })
      .where(eq(purchaseOrders.id, purchaseOrderId))
      .returning();

    return { po: updated, priceWarnings };
  });
}

export async function cancelPurchaseOrder(params: { purchaseOrderId: string; cancelledBy: string }) {
  const { purchaseOrderId } = params;

  return db.transaction(async (tx) => {
    const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).limit(1);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "ordered") throw new Error(`Purchase order is already ${po.status}`);

    const [updated] = await tx.update(purchaseOrders).set({ status: "cancelled" }).where(eq(purchaseOrders.id, purchaseOrderId)).returning();
    return updated;
  });
}

export async function getPriceHistory(params: { rawMaterialId: string; limit?: number }) {
  const { rawMaterialId, limit = 100 } = params;
  return db
    .select()
    .from(supplierPriceHistory)
    .where(eq(supplierPriceHistory.rawMaterialId, rawMaterialId))
    .orderBy(desc(supplierPriceHistory.recordedAt))
    .limit(limit);
}

export async function getSupplierPriceHistory(params: { supplierId: string; limit?: number }) {
  const { supplierId, limit = 200 } = params;
  return db
    .select()
    .from(supplierPriceHistory)
    .where(eq(supplierPriceHistory.supplierId, supplierId))
    .orderBy(desc(supplierPriceHistory.recordedAt))
    .limit(limit);
}
