import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { posSaleItems, posSales, products, recipeItems, recipes } from "@/db/schema";
import { applyStockMovement, InsufficientStockError, type DbExecutor } from "@/server/lib/inventory";
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
function computeTotals(grossSubtotal: number, discountType: "none" | "senior_pwd") {
  if (discountType === "senior_pwd") {
    const vatExclusive = grossSubtotal / (1 + VAT_RATE);
    const discountAmount = vatExclusive * 0.2;
    const total = vatExclusive - discountAmount;
    return { discountAmount, total };
  }

  return { discountAmount: 0, total: grossSubtotal };
}

async function resolveSaleLines(rawLines: SaleLineRequest[]): Promise<SaleLineInput[]> {
  const productRows = await db
    .select({ id: products.id, price: products.price, active: products.active })
    .from(products)
    .where(inArray(products.id, rawLines.map((l) => l.productId)));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  return rawLines.map((l) => {
    const product = productById.get(l.productId);
    if (!product || !product.active) throw new Error("One of the items on this order is no longer available");
    return { productId: l.productId, quantity: l.quantity, unitPrice: Number(product.price) };
  });
}

/**
 * Inserts the line items and deducts stock for them (recipe ingredients if
 * the product has one, otherwise the product's own stock) — shared by
 * createSale (single-shot: ring and pay immediately) and addItemsToOrder
 * (append to a tab that's still open). Both ultimately record the same
 * kind of stock movement at the same moment: when the item is rung in,
 * not when the bill is eventually paid — the food is prepared and
 * consumed before settlement, so inventory must reflect that immediately.
 */
async function insertLinesAndDeductStock(
  tx: DbExecutor,
  params: { saleId: string; branchId: string; lines: SaleLineInput[]; performedBy: string },
) {
  const { saleId, branchId, lines, performedBy } = params;

  for (const line of lines) {
    await tx.insert(posSaleItems).values({
      posSaleId: saleId,
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
            referenceId: saleId,
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
          referenceId: saleId,
        },
        tx,
      );
    }
  }
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

  const lines = await resolveSaleLines(params.lines);
  const grossSubtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const { discountAmount, total } = computeTotals(grossSubtotal, discountType);
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
        status: "closed",
        discountType,
        discountAmount: String(discountAmount),
        tenderedAmount: String(tenderedAmount),
        changeAmount: String(tenderedAmount - total),
        shiftId: openShift?.id,
      })
      .returning();

    await insertLinesAndDeductStock(tx, { saleId: sale.id, branchId, lines, performedBy });

    return sale;
  });
}

/**
 * Opens a new tab/order for a table — status 'open', no items yet, total
 * starts at zero. Stays open (and can keep having items added to it) until
 * someone pays it with payAndCloseOrder. Deliberately NOT tagged to a
 * shift here — a tab can outlive the shift it was opened under, and what
 * matters for cash reconciliation is who's actually holding the drawer
 * when the money is collected, so shiftId is set at payment time instead.
 */
export async function createOpenOrder(params: { branchId: string; tableLabel?: string; performedBy: string }) {
  const { branchId, tableLabel, performedBy } = params;

  const [order] = await db
    .insert(posSales)
    .values({
      branchId,
      saleDate: new Date().toISOString().slice(0, 10),
      totalAmount: "0",
      source: "internal_pos",
      importedBy: performedBy,
      status: "open",
      tableLabel: tableLabel || null,
    })
    .returning();

  return order;
}

export async function listOpenOrders(branchId: string | null) {
  const whereClause = branchId ? and(eq(posSales.status, "open"), eq(posSales.branchId, branchId)) : eq(posSales.status, "open");
  return db.select().from(posSales).where(whereClause).orderBy(desc(posSales.importedAt));
}

/**
 * Appends items to a still-open order — deducts stock immediately (same
 * as an instant sale) and adds their subtotal to the order's running
 * total. Can be called any number of times while the order stays open.
 */
export async function addItemsToOrder(params: { orderId: string; lines: SaleLineRequest[]; performedBy: string }) {
  const { orderId, performedBy } = params;
  if (params.lines.length === 0) throw new Error("No items to add");

  const lines = await resolveSaleLines(params.lines);
  const linesSubtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(posSales).where(eq(posSales.id, orderId)).limit(1).for("update");
    if (!order) throw new Error("Order not found");
    if (order.status !== "open") throw new Error(`Order is already ${order.status}`);

    await insertLinesAndDeductStock(tx, { saleId: orderId, branchId: order.branchId, lines, performedBy });

    const [updated] = await tx
      .update(posSales)
      .set({ totalAmount: String(Number(order.totalAmount) + linesSubtotal) })
      .where(eq(posSales.id, orderId))
      .returning();

    return updated;
  });
}

/**
 * Settles an open order: applies the discount to everything rung in so
 * far, verifies the tender covers it, and marks it closed. Stock was
 * already deducted as items were added — this step is purely financial.
 */
export async function payAndCloseOrder(params: {
  orderId: string;
  discountType: "none" | "senior_pwd";
  tenderedAmount: number;
}) {
  const { orderId, discountType, tenderedAmount } = params;

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(posSales).where(eq(posSales.id, orderId)).limit(1).for("update");
    if (!order) throw new Error("Order not found");
    if (order.status !== "open") throw new Error(`Order is already ${order.status}`);

    const items = await tx.select({ subtotal: posSaleItems.subtotal }).from(posSaleItems).where(eq(posSaleItems.posSaleId, orderId));
    if (items.length === 0) throw new Error("Cannot close an order with no items — add items or void it instead");

    const grossSubtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
    const { discountAmount, total } = computeTotals(grossSubtotal, discountType);
    if (tenderedAmount < total) throw new Error("Tendered amount is less than the total due");

    const openShift = await getOpenShift(order.branchId);

    const [updated] = await tx
      .update(posSales)
      .set({
        status: "closed",
        totalAmount: String(total),
        discountType,
        discountAmount: String(discountAmount),
        tenderedAmount: String(tenderedAmount),
        changeAmount: String(tenderedAmount - total),
        shiftId: openShift?.id,
      })
      .where(eq(posSales.id, orderId))
      .returning();

    return updated;
  });
}

/**
 * Voids an order opened by mistake. Only allowed with zero items — once
 * anything's been rung in (and stock deducted for it), it must go through
 * payAndCloseOrder instead, same as any other sale.
 */
export async function voidEmptyOrder(params: { orderId: string }) {
  const { orderId } = params;

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(posSales).where(eq(posSales.id, orderId)).limit(1).for("update");
    if (!order) throw new Error("Order not found");
    if (order.status !== "open") throw new Error(`Order is already ${order.status}`);

    const [existingItem] = await tx.select({ id: posSaleItems.id }).from(posSaleItems).where(eq(posSaleItems.posSaleId, orderId)).limit(1);
    if (existingItem) throw new Error("Cannot void an order that already has items on it — close it instead");

    const [updated] = await tx.update(posSales).set({ status: "void" }).where(eq(posSales.id, orderId)).returning();
    return updated;
  });
}

export async function getSaleWithItems(saleId: string) {
  const [sale] = await db.select().from(posSales).where(eq(posSales.id, saleId)).limit(1);
  if (!sale) return null;
  const items = await db.select().from(posSaleItems).where(eq(posSaleItems.posSaleId, saleId));
  return { sale, items };
}

/**
 * Sales History only ever shows settled transactions — an open tab isn't
 * a completed sale yet, it belongs in the Open Orders list instead.
 */
export async function listSales(params: { branchId: string | null; limit?: number }) {
  const { branchId, limit = 100 } = params;
  const whereClause = branchId ? and(eq(posSales.branchId, branchId), eq(posSales.status, "closed")) : eq(posSales.status, "closed");
  return db.select().from(posSales).where(whereClause).orderBy(desc(posSales.importedAt)).limit(limit);
}

export async function getSalesSummary(params: { branchId: string | null; date: string }) {
  const { branchId, date } = params;
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  // Only settled sales count toward totals — an open tab's running total
  // isn't revenue until it's actually paid.
  const dateFilter = and(gte(posSales.importedAt, dayStart), lt(posSales.importedAt, dayEnd), eq(posSales.status, "closed"));
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
  const whereClause = branchId ? and(eq(posSales.branchId, branchId), eq(posSales.status, "closed")) : eq(posSales.status, "closed");

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
