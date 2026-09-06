import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { consumeFefo, getBatchAllocationsForLedger, getBatchesForItem, getExpiringBatches, InsufficientBatchStockError } from "@/server/lib/batches";
import { applyStockMovement } from "@/server/lib/inventory";
import { createTestBranch, createTestRawMaterial, createTestUser } from "../helpers/fixtures";

describe("batch and expiration (FIFO/FEFO) tracking", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  it("creates a batch on every raw material stock increase", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();

    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 100,
      performedBy,
      batchExpiryDate: "2026-12-01",
    });

    const batches = await getBatchesForItem({ branchId: branch.id, rawMaterialId: rice.id });
    expect(batches).toHaveLength(1);
    expect(Number(batches[0].quantityRemaining)).toBe(100);
    expect(batches[0].expiryDate).toBe("2026-12-01");
    expect(batches[0].sourceType).toBe("stock_in");
  });

  it("consumes First-Expired-First-Out — the soonest expiry is drawn first even when received later", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();

    // Received first, expires further out.
    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 50,
      performedBy,
      batchExpiryDate: "2026-12-31",
    });
    // Received second, but expires sooner — FEFO should prefer this one.
    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 50,
      performedBy,
      batchExpiryDate: "2026-09-10",
    });

    const outLedger = await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_out",
      quantityDelta: -30,
      performedBy,
      referenceType: "manual_stock_out",
    });

    const allocations = await getBatchAllocationsForLedger(outLedger.id);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].expiryDate).toBe("2026-09-10");
    expect(Number(allocations[0].quantity)).toBe(30);
  });

  it("spans multiple batches when the earliest-expiring one isn't enough, in FEFO order", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();

    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 20,
      performedBy,
      batchExpiryDate: "2026-09-10", // expires soonest, drawn first
    });
    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 50,
      performedBy,
      batchExpiryDate: "2026-12-31", // expires later, drawn second
    });

    const outLedger = await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_out",
      quantityDelta: -35,
      performedBy,
      referenceType: "manual_stock_out",
    });

    const allocations = await getBatchAllocationsForLedger(outLedger.id);
    expect(allocations).toHaveLength(2);
    const first = allocations.find((a) => a.expiryDate === "2026-09-10")!;
    const second = allocations.find((a) => a.expiryDate === "2026-12-31")!;
    expect(Number(first.quantity)).toBe(20); // fully drained
    expect(Number(second.quantity)).toBe(15); // remainder

    const remaining = await getBatchesForItem({ branchId: branch.id, rawMaterialId: rice.id });
    expect(remaining).toHaveLength(1); // the fully-drained batch no longer has remaining stock
    expect(Number(remaining[0].quantityRemaining)).toBe(35);
  });

  it("draws batches with no known expiry only after expiry-dated batches are exhausted", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();

    // No expiry date — would be received "first" chronologically but should
    // still be drawn LAST relative to anything with a known expiry.
    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 10,
      performedBy,
    });
    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 10,
      performedBy,
      batchExpiryDate: "2026-09-10",
    });

    const outLedger = await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_out",
      quantityDelta: -10,
      performedBy,
      referenceType: "manual_stock_out",
    });

    const allocations = await getBatchAllocationsForLedger(outLedger.id);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].expiryDate).toBe("2026-09-10");
  });

  it("throws when batch records don't cover the requested quantity", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();

    const ledgerRow = await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 10,
      performedBy,
    });

    // Calling consumeFefo directly (bypassing applyStockMovement's aggregate
    // check) simulates the batch/aggregate drift this guards against.
    await expect(
      consumeFefo(db, { branchId: branch.id, rawMaterialId: rice.id, quantity: 999, stockLedgerId: ledgerRow.id }),
    ).rejects.toThrow(InsufficientBatchStockError);
  });

  it("getExpiringBatches returns only batches with remaining stock inside the window, soonest first", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    const jowls = await createTestRawMaterial();

    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 10,
      performedBy,
      batchExpiryDate: "2026-09-08", // within a 7-day window from "today" in this fixed-clock test env
    });
    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: jowls.id,
      movementType: "stock_in",
      quantityDelta: 10,
      performedBy,
      batchExpiryDate: "2027-01-01", // far outside the window
    });

    const expiring = await getExpiringBatches({ branchId: branch.id, withinDays: 365 });
    const expiryDates = expiring.filter((b) => b.rawMaterialId === rice.id || b.rawMaterialId === jowls.id).map((b) => b.expiryDate);
    expect(expiryDates).toContain("2026-09-08");
    expect(expiryDates).toContain("2027-01-01");
    expect(expiryDates[0]! <= expiryDates[expiryDates.length - 1]!).toBe(true); // sorted ascending
  });
});
