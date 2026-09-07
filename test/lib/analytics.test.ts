import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { posSales } from "@/db/schema";
import {
  getBranchPerformance,
  getBranchProfitability,
  getFoodCostAnalysis,
  getProductProfitability,
} from "@/server/lib/analytics";
import { applyStockMovement } from "@/server/lib/inventory";
import { addItemsToOrder, createOpenOrder, createSale } from "@/server/lib/pos";
import { createTestBranch, createTestProduct, createTestRawMaterial, createTestRecipe, createTestUser } from "../helpers/fixtures";

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

describe("Phase 3 analytics", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  it("getFoodCostAnalysis computes cost/margin from the recipe's ingredients and skips products with no recipe", async () => {
    const flour = await createTestRawMaterial({ costPerUnit: 2 }); // ₱2/g
    const withRecipe = await createTestProduct({ price: 100 });
    await createTestRecipe({ productId: withRecipe.id, yieldQuantity: 1, items: [{ rawMaterialId: flour.id, quantity: 10 }] }); // 10g flour per unit
    const withoutRecipe = await createTestProduct({ price: 50 });

    const rows = await getFoodCostAnalysis();
    const row = rows.find((r) => r.productId === withRecipe.id)!;
    expect(row.foodCostPerUnit).toBe(20); // 10g * ₱2
    expect(row.foodCostPercent).toBe(20); // 20/100
    expect(row.grossMargin).toBe(80);
    expect(row.grossMarginPercent).toBe(80);

    expect(rows.find((r) => r.productId === withoutRecipe.id)).toBeUndefined();
  });

  it("getProductProfitability computes COGS for recipe-backed products and leaves it null for un-reciped ones", async () => {
    const branch = await createTestBranch();
    const sugar = await createTestRawMaterial({ costPerUnit: 3 });
    const reciped = await createTestProduct({ price: 60 });
    await createTestRecipe({ productId: reciped.id, yieldQuantity: 1, items: [{ rawMaterialId: sugar.id, quantity: 5 }] }); // cost 15/unit
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: sugar.id, movementType: "stock_in", quantityDelta: 1000, performedBy });

    const unreciped = await createTestProduct({ price: 40 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: unreciped.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    await createSale({ branchId: branch.id, lines: [{ productId: reciped.id, quantity: 4 }], discountType: "none", tenderedAmount: 240, performedBy });
    await createSale({ branchId: branch.id, lines: [{ productId: unreciped.id, quantity: 2 }], discountType: "none", tenderedAmount: 80, performedBy });

    const rows = await getProductProfitability({ from: isoDate(-1), to: isoDate(1) });

    const recipedRow = rows.find((r) => r.productId === reciped.id)!;
    expect(recipedRow.unitsSold).toBe(4);
    expect(recipedRow.revenue).toBe(240);
    expect(recipedRow.cogs).toBe(60); // 4 * 15
    expect(recipedRow.grossProfit).toBe(180);
    expect(recipedRow.grossMarginPercent).toBeCloseTo(75);

    const unrecipedRow = rows.find((r) => r.productId === unreciped.id)!;
    expect(unrecipedRow.revenue).toBe(80);
    expect(unrecipedRow.cogs).toBeNull();
    expect(unrecipedRow.grossProfit).toBeNull();
    expect(unrecipedRow.grossMarginPercent).toBeNull();
  });

  it("excludes sales outside the requested date range", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 30 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 50, performedBy });

    const sale = await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 2 }], discountType: "none", tenderedAmount: 60, performedBy });
    // Backdate this sale well outside the query window used below.
    await db.update(posSales).set({ importedAt: new Date("2020-01-01T00:00:00.000Z") }).where(eq(posSales.id, sale.id));

    const rows = await getProductProfitability({ from: isoDate(-1), to: isoDate(1) });
    expect(rows.find((r) => r.productId === product.id)).toBeUndefined();
  });

  it("getBranchProfitability aggregates per branch and reports cost coverage separately from margin", async () => {
    const branchA = await createTestBranch();
    const branchB = await createTestBranch();
    const rice = await createTestRawMaterial({ costPerUnit: 1 });
    const reciped = await createTestProduct({ price: 20 });
    await createTestRecipe({ productId: reciped.id, yieldQuantity: 1, items: [{ rawMaterialId: rice.id, quantity: 5 }] }); // cost 5/unit
    const unreciped = await createTestProduct({ price: 20 });

    await applyStockMovement({ branchId: branchA.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 1000, performedBy });
    await applyStockMovement({ branchId: branchB.id, itemType: "product", itemId: unreciped.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    await createSale({ branchId: branchA.id, lines: [{ productId: reciped.id, quantity: 3 }], discountType: "none", tenderedAmount: 60, performedBy });
    await createSale({ branchId: branchB.id, lines: [{ productId: unreciped.id, quantity: 3 }], discountType: "none", tenderedAmount: 60, performedBy });

    const rows = await getBranchProfitability({ from: isoDate(-1), to: isoDate(1) });

    const rowA = rows.find((r) => r.branchId === branchA.id)!;
    expect(rowA.revenue).toBe(60);
    expect(rowA.cogs).toBe(15); // 3 * 5
    expect(rowA.costCoveragePercent).toBe(100);

    const rowB = rows.find((r) => r.branchId === branchB.id)!;
    expect(rowB.revenue).toBe(60);
    expect(rowB.cogs).toBe(0); // no known cost basis at all
    expect(rowB.costCoveragePercent).toBe(0);
  });

  it("includes a sale made today when `to` is today's date (inclusive end of range, matching the UI's default)", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 45 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 1 }], discountType: "none", tenderedAmount: 45, performedBy });

    // `to: isoDate(0)` is exactly what the report pages default to — an
    // exclusive-at-midnight upper bound would wrongly cut off every sale
    // made today, which is the whole point of a "to: today" range.
    const rows = await getProductProfitability({ from: isoDate(0), to: isoDate(0) });
    expect(rows.find((r) => r.productId === product.id)).toBeDefined();
  });

  it("getBranchPerformance reports sales totals per branch within the date range", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 50 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 20, performedBy });

    await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 2 }], discountType: "none", tenderedAmount: 100, performedBy });
    await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 1 }], discountType: "none", tenderedAmount: 50, performedBy });

    const rows = await getBranchPerformance({ from: isoDate(-1), to: isoDate(1) });
    const row = rows.find((r) => r.branchId === branch.id)!;
    expect(row.transactionCount).toBe(2);
    expect(row.totalSales).toBe(150);
    expect(row.averageTicket).toBe(75);
  });

  it("an unpaid open tab doesn't inflate branch performance or profitability figures", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 500 }); // distinctive amount, easy to spot if leaked in
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    const order = await createOpenOrder({ branchId: branch.id, performedBy });
    await addItemsToOrder({ orderId: order.id, lines: [{ productId: product.id, quantity: 1 }], performedBy });

    const performanceRows = await getBranchPerformance({ from: isoDate(-1), to: isoDate(1) });
    const performanceRow = performanceRows.find((r) => r.branchId === branch.id)!;
    expect(performanceRow.totalSales).toBe(0);
    expect(performanceRow.transactionCount).toBe(0);

    const productRows = await getProductProfitability({ from: isoDate(-1), to: isoDate(1) });
    expect(productRows.find((r) => r.productId === product.id)).toBeUndefined();

    const branchProfitRows = await getBranchProfitability({ from: isoDate(-1), to: isoDate(1) });
    const branchProfitRow = branchProfitRows.find((r) => r.branchId === branch.id);
    expect(branchProfitRow).toBeUndefined(); // no closed sales at all for this branch in range
  });
});
