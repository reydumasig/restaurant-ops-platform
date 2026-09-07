import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockProducts, inventoryStockRawMaterials, posSaleItems, posSales } from "@/db/schema";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { addItemsToOrder, createOpenOrder, createSale, getDailySalesReport, getSalesSummary, listSales } from "@/server/lib/pos";
import { createTestBranch, createTestProduct, createTestRawMaterial, createTestRecipe, createTestUser } from "../helpers/fixtures";

describe("createSale", () => {
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

  async function productStockOf(branchId: string, productId: string) {
    const [row] = await db
      .select()
      .from(inventoryStockProducts)
      .where(and(eq(inventoryStockProducts.branchId, branchId), eq(inventoryStockProducts.productId, productId)));
    return row ? Number(row.quantity) : 0;
  }

  it("deducts recipe ingredients (scaled by quantity sold), not the product itself, when a recipe exists", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    const product = await createTestProduct({ price: 150 });
    await createTestRecipe({
      productId: product.id,
      yieldQuantity: 1,
      items: [{ rawMaterialId: rice.id, quantity: 200 }],
    });

    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 1000, performedBy });

    const sale = await createSale({
      branchId: branch.id,
      lines: [{ productId: product.id, quantity: 3 }],
      discountType: "none",
      tenderedAmount: 450,
      performedBy,
    });

    expect(Number(sale.totalAmount)).toBe(450);
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(1000 - 200 * 3);
    // No recipe-less product-stock deduction should have happened for this item.
    expect(await productStockOf(branch.id, product.id)).toBe(0);

    const items = await db.select().from(posSaleItems).where(eq(posSaleItems.posSaleId, sale.id));
    expect(items).toHaveLength(1);
    expect(Number(items[0].subtotal)).toBe(450);
  });

  it("deducts the product's own stock when it has no active recipe", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 25 });

    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    await createSale({
      branchId: branch.id,
      lines: [{ productId: product.id, quantity: 4 }],
      discountType: "none",
      tenderedAmount: 100,
      performedBy,
    });

    expect(await productStockOf(branch.id, product.id)).toBe(6);
  });

  it("rolls back the whole sale (no posSales row, no deduction) when an ingredient is short", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    const product = await createTestProduct({ price: 150 });
    await createTestRecipe({
      productId: product.id,
      yieldQuantity: 1,
      items: [{ rawMaterialId: rice.id, quantity: 200 }],
    });

    // Only enough rice for one serving, but the order asks for two.
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 200, performedBy });

    await expect(
      createSale({
        branchId: branch.id,
        lines: [{ productId: product.id, quantity: 2 }],
        discountType: "none",
        tenderedAmount: 300,
        performedBy,
      }),
    ).rejects.toThrow(InsufficientStockError);

    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(200);

    const salesForBranch = await db.select().from(posSales).where(eq(posSales.branchId, branch.id));
    expect(salesForBranch).toHaveLength(0);
  });

  it("applies the senior/PWD discount on the VAT-exclusive amount and rejects insufficient tender", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 112 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 5, performedBy });

    const sale = await createSale({
      branchId: branch.id,
      lines: [{ productId: product.id, quantity: 1 }],
      discountType: "senior_pwd",
      tenderedAmount: 90,
      performedBy,
    });

    // 112 gross / 1.12 VAT = 100 VAT-exclusive, less 20% senior discount = 80.
    expect(Number(sale.totalAmount)).toBe(80);
    expect(Number(sale.discountAmount)).toBe(20);

    await expect(
      createSale({
        branchId: branch.id,
        lines: [{ productId: product.id, quantity: 1 }],
        discountType: "none",
        tenderedAmount: 50,
        performedBy,
      }),
    ).rejects.toThrow("Tendered amount is less than the total due");
  });
});

describe("sales reporting excludes still-open tabs", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  it("listSales, getSalesSummary, and getDailySalesReport all exclude an unpaid open order", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 999 }); // distinctive amount, easy to spot if leaked in
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    const order = await createOpenOrder({ branchId: branch.id, performedBy });
    await addItemsToOrder({ orderId: order.id, lines: [{ productId: product.id, quantity: 1 }], performedBy });

    const sales = await listSales({ branchId: branch.id });
    expect(sales.find((s) => s.id === order.id)).toBeUndefined();

    const today = new Date().toISOString().slice(0, 10);
    const summary = await getSalesSummary({ branchId: branch.id, date: today });
    expect(Number(summary.totalSales)).toBe(0);
    expect(Number(summary.transactionCount)).toBe(0);

    const daily = await getDailySalesReport({ branchId: branch.id });
    const todayRow = daily.find((r) => r.saleDate === today);
    expect(todayRow).toBeUndefined();
  });
});
