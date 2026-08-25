import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockRawMaterials, stockLedgerRawMaterials } from "@/db/schema";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { createTestBranch, createTestRawMaterial, createTestUser } from "../helpers/fixtures";

describe("applyStockMovement", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  it("blocks a movement that would drive quantity negative, and writes no ledger row for it", async () => {
    const branch = await createTestBranch();
    const rawMaterial = await createTestRawMaterial();

    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rawMaterial.id,
      movementType: "stock_in",
      quantityDelta: 10,
      performedBy,
    });

    await expect(
      applyStockMovement({
        branchId: branch.id,
        itemType: "raw_material",
        itemId: rawMaterial.id,
        movementType: "stock_out",
        quantityDelta: -20,
        performedBy,
      }),
    ).rejects.toThrow(InsufficientStockError);

    const [stock] = await db
      .select()
      .from(inventoryStockRawMaterials)
      .where(and(eq(inventoryStockRawMaterials.branchId, branch.id), eq(inventoryStockRawMaterials.rawMaterialId, rawMaterial.id)));
    expect(Number(stock.quantity)).toBe(10);

    const ledgerRows = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(and(eq(stockLedgerRawMaterials.branchId, branch.id), eq(stockLedgerRawMaterials.rawMaterialId, rawMaterial.id)));
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0].movementType).toBe("stock_in");
  });

  it("writes a ledger row matching the resulting stock level on success", async () => {
    const branch = await createTestBranch();
    const rawMaterial = await createTestRawMaterial();

    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rawMaterial.id,
      movementType: "stock_in",
      quantityDelta: 50,
      performedBy,
    });
    const ledgerRow = await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rawMaterial.id,
      movementType: "adjustment_decrease",
      quantityDelta: -15,
      performedBy,
    });

    expect(Number(ledgerRow.quantityDelta)).toBe(-15);
    expect(Number(ledgerRow.quantityAfter)).toBe(35);

    const [stock] = await db
      .select()
      .from(inventoryStockRawMaterials)
      .where(and(eq(inventoryStockRawMaterials.branchId, branch.id), eq(inventoryStockRawMaterials.rawMaterialId, rawMaterial.id)));
    expect(Number(stock.quantity)).toBe(35);
  });

  it("serializes concurrent deductions instead of racing on a stale read (regression test)", async () => {
    const branch = await createTestBranch();
    const rawMaterial = await createTestRawMaterial();

    // Stock enough for exactly 3 of 5 concurrent -30 deductions (3*30=90 <=
    // 100 < 120=4*30). Before the FOR UPDATE fix, concurrent transactions
    // would all read the same stale currentQty=100 and all "succeed" with a
    // lost update — ending at 70 instead of correctly rejecting 2 of them
    // and ending at 10.
    await applyStockMovement({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rawMaterial.id,
      movementType: "stock_in",
      quantityDelta: 100,
      performedBy,
    });

    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        applyStockMovement({
          branchId: branch.id,
          itemType: "raw_material",
          itemId: rawMaterial.id,
          movementType: "sale_deduction",
          quantityDelta: -30,
          performedBy,
        }),
      ),
    );

    const fulfilled = attempts.filter((a) => a.status === "fulfilled");
    const rejected = attempts.filter((a) => a.status === "rejected");
    expect(fulfilled).toHaveLength(3);
    expect(rejected).toHaveLength(2);
    for (const r of rejected) {
      if (r.status === "rejected") expect(r.reason).toBeInstanceOf(InsufficientStockError);
    }

    const [stock] = await db
      .select()
      .from(inventoryStockRawMaterials)
      .where(and(eq(inventoryStockRawMaterials.branchId, branch.id), eq(inventoryStockRawMaterials.rawMaterialId, rawMaterial.id)));
    expect(Number(stock.quantity)).toBe(10);

    const ledgerRows = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(
        and(
          eq(stockLedgerRawMaterials.branchId, branch.id),
          eq(stockLedgerRawMaterials.rawMaterialId, rawMaterial.id),
          eq(stockLedgerRawMaterials.movementType, "sale_deduction"),
        ),
      );
    expect(ledgerRows).toHaveLength(3);
  });
});
