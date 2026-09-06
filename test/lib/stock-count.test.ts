import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockRawMaterials, stockCountItems, stockLedgerRawMaterials } from "@/db/schema";
import { getBatchesForItem } from "@/server/lib/batches";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { cancelStockCount, completeStockCount, createStockCount, getStockCountWithItems } from "@/server/lib/stock-count";
import { createTestBranch, createTestRawMaterial, createTestUser } from "../helpers/fixtures";

describe("stock counts", () => {
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

  it("snapshots current quantity as 'expected' for every item of that type at the branch", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    const jowls = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: jowls.id, movementType: "stock_in", quantityDelta: 50, performedBy });

    const count = await createStockCount({ branchId: branch.id, itemType: "raw_material", startedBy: performedBy });
    const detail = await getStockCountWithItems(count.id);

    expect(detail!.items).toHaveLength(2);
    const riceItem = detail!.items.find((i) => i.rawMaterialId === rice.id)!;
    expect(Number(riceItem.expectedQuantity)).toBe(100);
    expect(riceItem.countedQuantity).toBeNull();
  });

  it("refuses to start a count with nothing to count", async () => {
    const branch = await createTestBranch();
    await expect(createStockCount({ branchId: branch.id, itemType: "raw_material", startedBy: performedBy })).rejects.toThrow(
      "This branch has no raw material stock on record to count",
    );
  });

  it("completing applies an adjustment only where counted differs from expected, via the existing adjustment ledger types", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    const jowls = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: jowls.id, movementType: "stock_in", quantityDelta: 50, performedBy });

    const count = await createStockCount({ branchId: branch.id, itemType: "raw_material", startedBy: performedBy });
    const detail = await getStockCountWithItems(count.id);
    const riceItem = detail!.items.find((i) => i.rawMaterialId === rice.id)!;
    const jowlsItem = detail!.items.find((i) => i.rawMaterialId === jowls.id)!;

    const updated = await completeStockCount({
      stockCountId: count.id,
      completedBy: performedBy,
      counts: [
        { id: riceItem.id, countedQuantity: 92 }, // short by 8
        { id: jowlsItem.id, countedQuantity: 50 }, // matches exactly, no adjustment expected
      ],
    });

    expect(updated.status).toBe("completed");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(92);
    expect(await rawMaterialStockOf(branch.id, jowls.id)).toBe(50);

    const riceLedger = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(and(eq(stockLedgerRawMaterials.branchId, branch.id), eq(stockLedgerRawMaterials.rawMaterialId, rice.id), eq(stockLedgerRawMaterials.movementType, "adjustment_decrease")));
    expect(riceLedger).toHaveLength(1);
    expect(Number(riceLedger[0].quantityDelta)).toBe(-8);

    const jowlsAdjustments = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(and(eq(stockLedgerRawMaterials.branchId, branch.id), eq(stockLedgerRawMaterials.rawMaterialId, jowls.id), eq(stockLedgerRawMaterials.movementType, "adjustment_increase")));
    expect(jowlsAdjustments).toHaveLength(0); // exact match, no phantom adjustment entry

    const [savedRiceItem] = await db.select().from(stockCountItems).where(eq(stockCountItems.id, riceItem.id));
    expect(Number(savedRiceItem.countedQuantity)).toBe(92);

    // The adjustment_decrease consumed via FEFO automatically (no stock-count
    // specific batch integration needed); jowls' exact-match batch is
    // untouched since no adjustment was posted for it.
    const [riceBatch] = await getBatchesForItem({ branchId: branch.id, rawMaterialId: rice.id });
    expect(Number(riceBatch.quantityRemaining)).toBe(92);
    const [jowlsBatch] = await getBatchesForItem({ branchId: branch.id, rawMaterialId: jowls.id });
    expect(Number(jowlsBatch.quantityRemaining)).toBe(50);
  });

  it("supports an upward adjustment (counted more than expected)", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    const count = await createStockCount({ branchId: branch.id, itemType: "raw_material", startedBy: performedBy });
    const detail = await getStockCountWithItems(count.id);
    const riceItem = detail!.items[0];

    await completeStockCount({ stockCountId: count.id, completedBy: performedBy, counts: [{ id: riceItem.id, countedQuantity: 110 }] });

    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(110);
    const ledger = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(and(eq(stockLedgerRawMaterials.branchId, branch.id), eq(stockLedgerRawMaterials.rawMaterialId, rice.id), eq(stockLedgerRawMaterials.movementType, "adjustment_increase")));
    expect(ledger).toHaveLength(1);
    expect(Number(ledger[0].quantityDelta)).toBe(10);

    // The "found extra stock" adjustment creates its own batch (unknown
    // expiry) alongside the original stock_in batch.
    const batches = await getBatchesForItem({ branchId: branch.id, rawMaterialId: rice.id });
    expect(batches).toHaveLength(2);
    const foundBatch = batches.find((b) => b.sourceType === "adjustment_increase")!;
    expect(Number(foundBatch.quantityRemaining)).toBe(10);
  });

  it("rejects completing a count twice, and cancelling leaves stock untouched", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    const count = await createStockCount({ branchId: branch.id, itemType: "raw_material", startedBy: performedBy });
    const detail = await getStockCountWithItems(count.id);
    const riceItem = detail!.items[0];

    await completeStockCount({ stockCountId: count.id, completedBy: performedBy, counts: [{ id: riceItem.id, countedQuantity: 90 }] });
    await expect(
      completeStockCount({ stockCountId: count.id, completedBy: performedBy, counts: [{ id: riceItem.id, countedQuantity: 90 }] }),
    ).rejects.toThrow("Stock count is already completed");

    const cancelCount = await createStockCount({ branchId: branch.id, itemType: "raw_material", startedBy: performedBy });
    const cancelled = await cancelStockCount({ stockCountId: cancelCount.id });
    expect(cancelled.status).toBe("cancelled");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(90); // unaffected by the cancelled count
  });

  it("computes the adjustment against LIVE stock at completion, not the stale start-of-count snapshot", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    const count = await createStockCount({ branchId: branch.id, itemType: "raw_material", startedBy: performedBy });
    const detail = await getStockCountWithItems(count.id);
    const riceItem = detail!.items[0];
    expect(Number(riceItem.expectedQuantity)).toBe(100); // the stale snapshot

    // A legitimate sale happens mid-count, after the snapshot was taken.
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_out", quantityDelta: -80, performedBy });

    // Staff then physically count exactly what's left (20) — a perfect count,
    // zero real variance. If completion used the stale snapshot (100) instead
    // of live stock (20), this would wrongly compute a -80 "shrinkage"
    // adjustment on top of the sale that already happened.
    await completeStockCount({ stockCountId: count.id, completedBy: performedBy, counts: [{ id: riceItem.id, countedQuantity: 20 }] });

    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(20); // not double-deducted
  });
});
