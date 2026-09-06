import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockRawMaterials, purchaseOrderItems, rawMaterials, suppliers } from "@/db/schema";
import { getBatchesForItem } from "@/server/lib/batches";
import { cancelPurchaseOrder, createPurchaseOrder, getPriceHistory, receivePurchaseOrder } from "@/server/lib/purchasing";
import { createTestBranch, createTestRawMaterial, createTestUser, uniqueSuffix } from "../helpers/fixtures";

async function createTestSupplier() {
  const [supplier] = await db.insert(suppliers).values({ name: `Test Supplier ${uniqueSuffix()}` }).returning();
  return supplier;
}

describe("purchase orders", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  async function rawMaterialStockOf(branchId: string, rawMaterialId: string) {
    const [row] = await db
      .select()
      .from(inventoryStockRawMaterials)
      .where(and(eq(inventoryStockRawMaterials.branchId, branchId), eq(inventoryStockRawMaterials.rawMaterialId, rawMaterialId)));
    return row ? Number(row.quantity) : 0;
  }

  it("receiving a PO stocks in the goods, records price history, and updates the raw material's cost", async () => {
    const branch = await createTestBranch("commissary");
    const supplier = await createTestSupplier();
    const rice = await createTestRawMaterial({ costPerUnit: 1 });

    const po = await createPurchaseOrder({
      supplierId: supplier.id,
      branchId: branch.id,
      createdBy: performedBy,
      items: [{ rawMaterialId: rice.id, quantity: 500, unitCost: 0.05 }],
    });

    const [line] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));

    const { po: received, priceWarnings } = await receivePurchaseOrder({
      purchaseOrderId: po.id,
      receivedBy: performedBy,
      receipts: [{ id: line.id, quantityReceived: 500, actualUnitCost: 0.06 }],
    });

    expect(received.status).toBe("received");
    expect(priceWarnings).toHaveLength(0); // no prior price history yet, nothing to compare against

    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(500);

    const history = await getPriceHistory({ rawMaterialId: rice.id });
    expect(history).toHaveLength(1);
    expect(Number(history[0].unitCost)).toBe(0.06);

    const [updatedRm] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, rice.id));
    expect(Number(updatedRm.costPerUnit)).toBe(0.06);
  });

  it("records a batch with the supplier's expiry date and actual cost on receipt", async () => {
    const branch = await createTestBranch("commissary");
    const supplier = await createTestSupplier();
    const rice = await createTestRawMaterial({ costPerUnit: 1 });

    const po = await createPurchaseOrder({
      supplierId: supplier.id,
      branchId: branch.id,
      createdBy: performedBy,
      items: [{ rawMaterialId: rice.id, quantity: 200, unitCost: 0.05 }],
    });
    const [line] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));

    await receivePurchaseOrder({
      purchaseOrderId: po.id,
      receivedBy: performedBy,
      receipts: [{ id: line.id, quantityReceived: 200, actualUnitCost: 0.07, expiryDate: "2026-10-01" }],
    });

    const batches = await getBatchesForItem({ branchId: branch.id, rawMaterialId: rice.id });
    expect(batches).toHaveLength(1);
    expect(batches[0].expiryDate).toBe("2026-10-01");
    expect(Number(batches[0].unitCost)).toBe(0.07);
    expect(batches[0].sourceType).toBe("purchase_receipt");
  });

  it("flags a receipt priced well above the recent average, without blocking it", async () => {
    const branch = await createTestBranch("commissary");
    const supplier = await createTestSupplier();
    const jowls = await createTestRawMaterial({ costPerUnit: 0.2 });

    // Build up 5 price points around 0.20/g.
    for (const price of [0.19, 0.2, 0.2, 0.21, 0.2]) {
      const po = await createPurchaseOrder({
        supplierId: supplier.id,
        branchId: branch.id,
        createdBy: performedBy,
        items: [{ rawMaterialId: jowls.id, quantity: 100, unitCost: price }],
      });
      const [line] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));
      await receivePurchaseOrder({ purchaseOrderId: po.id, receivedBy: performedBy, receipts: [{ id: line.id, quantityReceived: 100, actualUnitCost: price }] });
    }

    // Now a delivery priced 50% above that average.
    const spikePo = await createPurchaseOrder({
      supplierId: supplier.id,
      branchId: branch.id,
      createdBy: performedBy,
      items: [{ rawMaterialId: jowls.id, quantity: 100, unitCost: 0.3 }],
    });
    const [spikeLine] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, spikePo.id));
    const { priceWarnings } = await receivePurchaseOrder({
      purchaseOrderId: spikePo.id,
      receivedBy: performedBy,
      receipts: [{ id: spikeLine.id, quantityReceived: 100, actualUnitCost: 0.3 }],
    });

    expect(priceWarnings).toHaveLength(1);
    expect(priceWarnings[0].percentAboveAverage).toBeGreaterThan(40);

    // Still received normally — the flag is informational, not a block.
    expect(await rawMaterialStockOf(branch.id, jowls.id)).toBe(600);
  });

  it("records a receiving discrepancy (received quantity differs from ordered) rather than blocking it", async () => {
    const branch = await createTestBranch("commissary");
    const supplier = await createTestSupplier();
    const rice = await createTestRawMaterial();

    const po = await createPurchaseOrder({
      supplierId: supplier.id,
      branchId: branch.id,
      createdBy: performedBy,
      items: [{ rawMaterialId: rice.id, quantity: 1000, unitCost: 0.05 }],
    });
    const [line] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));

    // Supplier only delivered 900 of the 1000 ordered.
    await receivePurchaseOrder({ purchaseOrderId: po.id, receivedBy: performedBy, receipts: [{ id: line.id, quantityReceived: 900 }] });

    const [lineAfter] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, line.id));
    expect(Number(lineAfter.quantityReceived)).toBe(900);
    expect(Number(lineAfter.quantityOrdered)).toBe(1000); // discrepancy is visible by comparing the two, not hidden

    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(900);
  });

  it("cancelling a PO before receiving leaves stock untouched and blocks a later receive", async () => {
    const branch = await createTestBranch("commissary");
    const supplier = await createTestSupplier();
    const rice = await createTestRawMaterial();

    const po = await createPurchaseOrder({
      supplierId: supplier.id,
      branchId: branch.id,
      createdBy: performedBy,
      items: [{ rawMaterialId: rice.id, quantity: 100, unitCost: 0.05 }],
    });

    const cancelled = await cancelPurchaseOrder({ purchaseOrderId: po.id, cancelledBy: performedBy });
    expect(cancelled.status).toBe("cancelled");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(0);

    const [line] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));
    await expect(
      receivePurchaseOrder({ purchaseOrderId: po.id, receivedBy: performedBy, receipts: [{ id: line.id, quantityReceived: 100 }] }),
    ).rejects.toThrow("Purchase order is already cancelled");
  });

  it("rejects receiving the same PO twice", async () => {
    const branch = await createTestBranch("commissary");
    const supplier = await createTestSupplier();
    const rice = await createTestRawMaterial();

    const po = await createPurchaseOrder({
      supplierId: supplier.id,
      branchId: branch.id,
      createdBy: performedBy,
      items: [{ rawMaterialId: rice.id, quantity: 100, unitCost: 0.05 }],
    });
    const [line] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));

    await receivePurchaseOrder({ purchaseOrderId: po.id, receivedBy: performedBy, receipts: [{ id: line.id, quantityReceived: 100 }] });

    await expect(
      receivePurchaseOrder({ purchaseOrderId: po.id, receivedBy: performedBy, receipts: [{ id: line.id, quantityReceived: 100 }] }),
    ).rejects.toThrow("Purchase order is already received");

    // Confirms it wasn't double-applied to stock.
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(100);
  });
});
