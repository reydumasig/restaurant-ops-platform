import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, posSaleItems, posSales, products, rawMaterials, recipeItems, recipes } from "@/db/schema";
import { getInventoryValueByBranch, getLowStockAlerts } from "@/server/lib/dashboard";

/** [from 00:00, to 00:00 of the day AFTER `to`) — an inclusive "to" date. */
function dateRangeFilter(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return and(gte(posSales.importedAt, start), lt(posSales.importedAt, end));
}

/**
 * Food cost per unit for every ACTIVE recipe-backed product: the sum of
 * each ingredient's (quantity * raw material cost) divided by the
 * recipe's yield. Products with no recipe are omitted — there's no BOM to
 * cost them from. As of this milestone only a handful of the full menu
 * has a recipe decomposed (a known, pre-existing data-completeness gap,
 * not a bug here); this report covers whatever recipes exist and will
 * automatically expand as more are added.
 */
export async function getFoodCostAnalysis() {
  const rows = await db
    .select({
      recipeId: recipes.id,
      productId: recipes.productId,
      productName: products.name,
      productSku: products.sku,
      price: products.price,
      yieldQuantity: recipes.yieldQuantity,
      itemQuantity: recipeItems.quantity,
      rawMaterialCost: rawMaterials.costPerUnit,
    })
    .from(recipes)
    .innerJoin(products, eq(recipes.productId, products.id))
    .innerJoin(recipeItems, eq(recipeItems.recipeId, recipes.id))
    .innerJoin(rawMaterials, eq(recipeItems.rawMaterialId, rawMaterials.id))
    .where(eq(recipes.active, true));

  const byRecipe = new Map<
    string,
    { productId: string; productName: string; productSku: string; price: number; yieldQuantity: number; ingredientCost: number }
  >();

  for (const row of rows) {
    const entry = byRecipe.get(row.recipeId) ?? {
      productId: row.productId,
      productName: row.productName,
      productSku: row.productSku,
      price: Number(row.price),
      yieldQuantity: Number(row.yieldQuantity),
      ingredientCost: 0,
    };
    entry.ingredientCost += Number(row.itemQuantity) * Number(row.rawMaterialCost);
    byRecipe.set(row.recipeId, entry);
  }

  return Array.from(byRecipe.values()).map((e) => {
    const foodCostPerUnit = e.yieldQuantity > 0 ? e.ingredientCost / e.yieldQuantity : 0;
    const foodCostPercent = e.price > 0 ? (foodCostPerUnit / e.price) * 100 : null;
    const grossMargin = e.price - foodCostPerUnit;
    const grossMarginPercent = e.price > 0 ? (grossMargin / e.price) * 100 : null;
    return {
      productId: e.productId,
      productName: e.productName,
      productSku: e.productSku,
      price: e.price,
      foodCostPerUnit,
      foodCostPercent,
      grossMargin,
      grossMarginPercent,
    };
  });
}

async function getFoodCostPerUnitMap() {
  const rows = await getFoodCostAnalysis();
  return new Map(rows.map((r) => [r.productId, r.foodCostPerUnit]));
}

/**
 * One row per active branch, aggregated over [from, to): sales revenue,
 * transaction count, average ticket, current inventory value, and count
 * of items below reorder point — the cross-branch comparison view Phase 1's
 * dashboard doesn't have (that one shows a single branch, or an aggregate,
 * never all branches side by side).
 */
export async function getBranchPerformance(params: { from: string; to: string }) {
  const { from, to } = params;
  const dateFilter = dateRangeFilter(from, to);

  const branchRows = await db.select().from(branches).where(eq(branches.active, true));
  const [inventoryByBranch, allLowStock] = await Promise.all([getInventoryValueByBranch(), getLowStockAlerts(null)]);
  const inventoryByBranchId = new Map(inventoryByBranch.map((b) => [b.branchId, b]));
  const lowStockCountByBranch = new Map<string, number>();
  for (const alert of allLowStock) {
    lowStockCountByBranch.set(alert.branchId, (lowStockCountByBranch.get(alert.branchId) ?? 0) + 1);
  }

  return Promise.all(
    branchRows.map(async (branch) => {
      const rangeRows = await db
        .select({ totalAmount: posSales.totalAmount })
        .from(posSales)
        .where(and(eq(posSales.branchId, branch.id), dateFilter));
      const totalSales = rangeRows.reduce((sum, r) => sum + Number(r.totalAmount), 0);
      const transactionCount = rangeRows.length;

      return {
        branchId: branch.id,
        branchName: branch.name,
        totalSales,
        transactionCount,
        averageTicket: transactionCount > 0 ? totalSales / transactionCount : 0,
        inventoryValue: inventoryByBranchId.get(branch.id)?.totalValue ?? 0,
        lowStockCount: lowStockCountByBranch.get(branch.id) ?? 0,
      };
    }),
  );
}

/**
 * Revenue, units sold, and gross profit per product over [from, to).
 * Cost of goods sold is only known for recipe-backed products (see
 * getFoodCostAnalysis) — for everything else, cogs/grossProfit come back
 * null rather than silently treating unknown cost as zero.
 */
export async function getProductProfitability(params: { from: string; to: string }) {
  const { from, to } = params;
  const dateFilter = dateRangeFilter(from, to);

  const rows = await db
    .select({
      productId: posSaleItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: posSaleItems.quantity,
      subtotal: posSaleItems.subtotal,
    })
    .from(posSaleItems)
    .innerJoin(posSales, eq(posSaleItems.posSaleId, posSales.id))
    .innerJoin(products, eq(posSaleItems.productId, products.id))
    .where(dateFilter);

  const costMap = await getFoodCostPerUnitMap();
  const byProduct = new Map<string, { productName: string; productSku: string; unitsSold: number; revenue: number }>();

  for (const row of rows) {
    const entry = byProduct.get(row.productId) ?? { productName: row.productName, productSku: row.productSku, unitsSold: 0, revenue: 0 };
    entry.unitsSold += Number(row.quantity);
    entry.revenue += Number(row.subtotal);
    byProduct.set(row.productId, entry);
  }

  return Array.from(byProduct.entries()).map(([productId, e]) => {
    const unitCost = costMap.get(productId);
    const cogs = unitCost != null ? unitCost * e.unitsSold : null;
    const grossProfit = cogs != null ? e.revenue - cogs : null;
    const grossMarginPercent = cogs != null && e.revenue > 0 ? (grossProfit! / e.revenue) * 100 : null;
    return { productId, productName: e.productName, productSku: e.productSku, unitsSold: e.unitsSold, revenue: e.revenue, cogs, grossProfit, grossMarginPercent };
  });
}

/**
 * Same idea as getProductProfitability, aggregated by branch instead of
 * product. costCoveragePercent reports what fraction of units sold in
 * that branch had a known cost basis, so a branch whose menu is mostly
 * un-reciped doesn't get a falsely-precise-looking margin number.
 */
export async function getBranchProfitability(params: { from: string; to: string }) {
  const { from, to } = params;
  const dateFilter = dateRangeFilter(from, to);

  const rows = await db
    .select({
      branchId: posSales.branchId,
      productId: posSaleItems.productId,
      quantity: posSaleItems.quantity,
      subtotal: posSaleItems.subtotal,
    })
    .from(posSaleItems)
    .innerJoin(posSales, eq(posSaleItems.posSaleId, posSales.id))
    .where(dateFilter);

  const costMap = await getFoodCostPerUnitMap();
  const byBranch = new Map<string, { revenue: number; cogs: number; unitsWithKnownCost: number; unitsTotal: number }>();

  for (const row of rows) {
    const entry = byBranch.get(row.branchId) ?? { revenue: 0, cogs: 0, unitsWithKnownCost: 0, unitsTotal: 0 };
    const quantity = Number(row.quantity);
    entry.revenue += Number(row.subtotal);
    entry.unitsTotal += quantity;
    const unitCost = costMap.get(row.productId);
    if (unitCost != null) {
      entry.cogs += unitCost * quantity;
      entry.unitsWithKnownCost += quantity;
    }
    byBranch.set(row.branchId, entry);
  }

  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));

  return Array.from(byBranch.entries()).map(([branchId, e]) => ({
    branchId,
    branchName: branchById.get(branchId),
    revenue: e.revenue,
    cogs: e.cogs,
    grossProfit: e.revenue - e.cogs,
    grossMarginPercent: e.revenue > 0 ? ((e.revenue - e.cogs) / e.revenue) * 100 : null,
    costCoveragePercent: e.unitsTotal > 0 ? (e.unitsWithKnownCost / e.unitsTotal) * 100 : null,
  }));
}
