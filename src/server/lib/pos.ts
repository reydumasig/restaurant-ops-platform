import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { posSaleItems, posSales, products, recipeItems, recipes } from "@/db/schema";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { getOpenShift } from "@/server/lib/pos-shifts";

const VAT_RATE = 0.12;

export type SaleLineRequest = { productId: string; quantity: number };
type SaleLineInput = { productId: string; quantity: number; unitPrice: number };

/**
 * Standard 20% senior-citizen/PWD discount, computed on the VAT-exclusive
 * amount, with VAT itself waived on the discounted portion — the common
 * BIR treatment for food service. This is a reasonable approximation, not
 * a guarantee of official-receipt compliance; the client is responsible
 * for verifying that separately (see conversation notes).
 */
function computeTotals(lines: SaleLineInput[], discountType: "none" | "senior_pwd") {
  const grossSubtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  if (discountType === "senior_pwd") {
    const vatExclusive = grossSubtotal / (1 + VAT_RATE);
    const discountAmount = vatExclusive * 0.2;
    const total = vatExclusive - discountAmount;
    return { subtotal: grossSubtotal, discountAmount, total };
  }

  return { subtotal: grossSubtotal, discountAmount: 0, total: grossSubtotal };
}

export async function createSale(params: {
  branchId: string;
  lines: SaleLineRequest[];
  discountType: "none" | "senior_pwd";
  tenderedAmount: number;
  performedBy: string;
}) {
  const { branchId, discountType, tenderedAmount, performedBy } = params;
  if (params.lines.length === 0) throw new Error("A sale needs at least one item");

  const productRows = await db
    .select({ id: products.id, price: products.price, active: products.active })
    .from(products)
    .where(inArray(products.id, params.lines.map((l) => l.productId)));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const lines: SaleLineInput[] = params.lines.map((l) => {
    const product = productById.get(l.productId);
    if (!product || !product.active) throw new Error("One of the items on this order is no longer available");
    return { productId: l.productId, quantity: l.quantity, unitPrice: Number(product.price) };
  });

  const { discountAmount, total } = computeTotals(lines, discountType);
  if (tenderedAmount < total) throw new Error("Tendered amount is less than the total due");

  const openShift = await getOpenShift(branchId);

  return db.transaction(async (tx) => {
    const [sale] = await tx
      .insert(posSales)
      .values({
        branchId,
        saleDate: new Date().toISOString().slice(0, 10),
        totalAmount: String(total),
        source: "internal_pos",
        importedBy: performedBy,
        discountType,
        discountAmount: String(discountAmount),
        tenderedAmount: String(tenderedAmount),
        changeAmount: String(tenderedAmount - total),
        shiftId: openShift?.id,
      })
      .returning();

    for (const line of lines) {
      await tx.insert(posSaleItems).values({
        posSaleId: sale.id,
        productId: line.productId,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        subtotal: String(line.unitPrice * line.quantity),
      });

      const [recipe] = await tx.select().from(recipes).where(eq(recipes.productId, line.productId)).limit(1);

      if (recipe && recipe.active) {
        const items = await tx.select().from(recipeItems).where(eq(recipeItems.recipeId, recipe.id));
        const scale = line.quantity / Number(recipe.yieldQuantity);

        for (const item of items) {
          await applyStockMovement(
            {
              branchId,
              itemType: "raw_material",
              itemId: item.rawMaterialId,
              movementType: "sale_deduction",
              quantityDelta: -(Number(item.quantity) * scale),
              performedBy,
              referenceType: "pos_sale",
              referenceId: sale.id,
            },
            tx,
          );
        }
      } else {
        await applyStockMovement(
          {
            branchId,
            itemType: "product",
            itemId: line.productId,
            movementType: "sale_deduction",
            quantityDelta: -line.quantity,
            performedBy,
            referenceType: "pos_sale",
            referenceId: sale.id,
          },
          tx,
        );
      }
    }

    return sale;
  });
}

export async function getSaleWithItems(saleId: string) {
  const [sale] = await db.select().from(posSales).where(eq(posSales.id, saleId)).limit(1);
  if (!sale) return null;
  const items = await db.select().from(posSaleItems).where(eq(posSaleItems.posSaleId, saleId));
  return { sale, items };
}

export async function listSales(params: { branchId: string | null; limit?: number }) {
  const { branchId, limit = 100 } = params;
  if (!branchId) {
    return db.select().from(posSales).orderBy(desc(posSales.importedAt)).limit(limit);
  }
  return db.select().from(posSales).where(eq(posSales.branchId, branchId)).orderBy(desc(posSales.importedAt)).limit(limit);
}

export async function getSalesSummary(params: { branchId: string | null; date: string }) {
  const { branchId, date } = params;
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const dateFilter = and(gte(posSales.importedAt, dayStart), lt(posSales.importedAt, dayEnd));
  const whereClause = branchId ? and(eq(posSales.branchId, branchId), dateFilter) : dateFilter;

  const [totals] = await db
    .select({
      totalSales: sql<string>`coalesce(sum(${posSales.totalAmount}), 0)`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(posSales)
    .where(whereClause);

  const topProducts = await db
    .select({
      productId: posSaleItems.productId,
      productName: products.name,
      totalQuantity: sql<string>`sum(${posSaleItems.quantity})`,
      totalRevenue: sql<string>`sum(${posSaleItems.subtotal})`,
    })
    .from(posSaleItems)
    .innerJoin(posSales, eq(posSaleItems.posSaleId, posSales.id))
    .innerJoin(products, eq(posSaleItems.productId, products.id))
    .where(whereClause)
    .groupBy(posSaleItems.productId, products.name)
    .orderBy(desc(sql`sum(${posSaleItems.quantity})`))
    .limit(10);

  return {
    totalSales: totals?.totalSales ?? "0",
    transactionCount: totals?.transactionCount ?? 0,
    topProducts,
  };
}

export async function getDailySalesReport(params: { branchId: string | null }) {
  const { branchId } = params;
  const whereClause = branchId ? eq(posSales.branchId, branchId) : undefined;

  const rows = await db
    .select({
      saleDate: posSales.saleDate,
      totalSales: sql<string>`sum(${posSales.totalAmount})`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(posSales)
    .where(whereClause)
    .groupBy(posSales.saleDate)
    .orderBy(desc(posSales.saleDate));

  return rows;
}

export { InsufficientStockError };
