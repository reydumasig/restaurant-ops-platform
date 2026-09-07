import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockProducts, posSales } from "@/db/schema";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { addItemsToOrder, createOpenOrder, listOpenOrders, payAndCloseOrder, voidEmptyOrder } from "@/server/lib/pos";
import { closeShift, openShift } from "@/server/lib/pos-shifts";
import { createTestBranch, createTestProduct, createTestUser } from "../helpers/fixtures";

describe("POS open orders (tabs)", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  async function productStockOf(branchId: string, productId: string) {
    const [row] = await db
      .select()
      .from(inventoryStockProducts)
      .where(and(eq(inventoryStockProducts.branchId, branchId), eq(inventoryStockProducts.productId, productId)));
    return row ? Number(row.quantity) : 0;
  }

  it("opens with status 'open', zero total, and no shift attached even when a shift is currently open", async () => {
    const branch = await createTestBranch();
    await openShift({ branchId: branch.id, startingCash: 1000, openedBy: performedBy });

    const order = await createOpenOrder({ branchId: branch.id, tableLabel: "Table 3", performedBy });
    expect(order.status).toBe("open");
    expect(Number(order.totalAmount)).toBe(0);
    expect(order.tableLabel).toBe("Table 3");
    expect(order.shiftId).toBeNull();
  });

  it("adding items deducts stock immediately and accumulates the running total across multiple additions", async () => {
    const branch = await createTestBranch();
    const burger = await createTestProduct({ price: 150 });
    const soda = await createTestProduct({ price: 40 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: burger.id, movementType: "stock_in", quantityDelta: 20, performedBy });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: soda.id, movementType: "stock_in", quantityDelta: 20, performedBy });

    const order = await createOpenOrder({ branchId: branch.id, performedBy });

    const afterFirst = await addItemsToOrder({ orderId: order.id, lines: [{ productId: burger.id, quantity: 2 }], performedBy });
    expect(Number(afterFirst.totalAmount)).toBe(300);
    expect(await productStockOf(branch.id, burger.id)).toBe(18);

    // Customer orders more later in the same visit — a second round-trip to the same order.
    const afterSecond = await addItemsToOrder({ orderId: order.id, lines: [{ productId: soda.id, quantity: 3 }], performedBy });
    expect(Number(afterSecond.totalAmount)).toBe(300 + 120);
    expect(await productStockOf(branch.id, soda.id)).toBe(17);
  });

  it("rejects adding items to a closed or void order", async () => {
    const branch = await createTestBranch();
    const item = await createTestProduct({ price: 50 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: item.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    const order = await createOpenOrder({ branchId: branch.id, performedBy });
    await addItemsToOrder({ orderId: order.id, lines: [{ productId: item.id, quantity: 1 }], performedBy });
    await payAndCloseOrder({ orderId: order.id, discountType: "none", tenderedAmount: 50 });

    await expect(addItemsToOrder({ orderId: order.id, lines: [{ productId: item.id, quantity: 1 }], performedBy })).rejects.toThrow(
      "Order is already closed",
    );
  });

  it("rolls back the whole addition (no items inserted, no stock consumed) when one line is short on stock", async () => {
    const branch = await createTestBranch();
    const plenty = await createTestProduct({ price: 50 });
    const scarce = await createTestProduct({ price: 30 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: plenty.id, movementType: "stock_in", quantityDelta: 100, performedBy });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: scarce.id, movementType: "stock_in", quantityDelta: 1, performedBy });

    const order = await createOpenOrder({ branchId: branch.id, performedBy });

    await expect(
      addItemsToOrder({ orderId: order.id, lines: [{ productId: plenty.id, quantity: 2 }, { productId: scarce.id, quantity: 5 }], performedBy }),
    ).rejects.toThrow(InsufficientStockError);

    expect(await productStockOf(branch.id, plenty.id)).toBe(100); // untouched — the transaction rolled back
    const [orderAfter] = await db.select().from(posSales).where(eq(posSales.id, order.id));
    expect(Number(orderAfter.totalAmount)).toBe(0);
  });

  it("closes with the discount applied to everything rung in, and is attributed to whichever shift is open at PAYMENT time", async () => {
    const branch = await createTestBranch();
    const item = await createTestProduct({ price: 112 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: item.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    const order = await createOpenOrder({ branchId: branch.id, performedBy });
    await addItemsToOrder({ orderId: order.id, lines: [{ productId: item.id, quantity: 1 }], performedBy });

    // Order opened with no shift running; a shift only starts AFTER items were added.
    const shift = await openShift({ branchId: branch.id, startingCash: 500, openedBy: performedBy });

    const closed = await payAndCloseOrder({ orderId: order.id, discountType: "senior_pwd", tenderedAmount: 80 });
    expect(closed.status).toBe("closed");
    expect(Number(closed.totalAmount)).toBe(80); // 112/1.12=100, less 20% senior discount
    expect(Number(closed.discountAmount)).toBe(20);
    expect(closed.shiftId).toBe(shift.id); // attributed to the shift open at payment, not order-open, time

    const closedShift = await closeShift({ shiftId: shift.id, countedCash: 580, closedBy: performedBy });
    expect(Number(closedShift.expectedCash)).toBe(580); // 500 float + 80 from this order
  });

  it("rejects closing an order with no items, and rejects tender less than the total", async () => {
    const branch = await createTestBranch();
    const item = await createTestProduct({ price: 100 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: item.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    const empty = await createOpenOrder({ branchId: branch.id, performedBy });
    await expect(payAndCloseOrder({ orderId: empty.id, discountType: "none", tenderedAmount: 0 })).rejects.toThrow(
      "Cannot close an order with no items",
    );

    const withItems = await createOpenOrder({ branchId: branch.id, performedBy });
    await addItemsToOrder({ orderId: withItems.id, lines: [{ productId: item.id, quantity: 1 }], performedBy });
    await expect(payAndCloseOrder({ orderId: withItems.id, discountType: "none", tenderedAmount: 50 })).rejects.toThrow(
      "Tendered amount is less than the total due",
    );
  });

  it("voids an order with zero items, but refuses to void one that already has items on it", async () => {
    const branch = await createTestBranch();
    const item = await createTestProduct({ price: 50 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: item.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    const empty = await createOpenOrder({ branchId: branch.id, performedBy });
    const voided = await voidEmptyOrder({ orderId: empty.id });
    expect(voided.status).toBe("void");

    const withItems = await createOpenOrder({ branchId: branch.id, performedBy });
    await addItemsToOrder({ orderId: withItems.id, lines: [{ productId: item.id, quantity: 1 }], performedBy });
    await expect(voidEmptyOrder({ orderId: withItems.id })).rejects.toThrow("Cannot void an order that already has items on it");
  });

  it("an order still open when the shift closes does NOT count toward that shift's expected cash", async () => {
    const branch = await createTestBranch();
    const item = await createTestProduct({ price: 100 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: item.id, movementType: "stock_in", quantityDelta: 10, performedBy });

    const shift = await openShift({ branchId: branch.id, startingCash: 1000, openedBy: performedBy });
    const order = await createOpenOrder({ branchId: branch.id, performedBy });
    // Table is still eating — items are rung in but the bill isn't paid yet.
    await addItemsToOrder({ orderId: order.id, lines: [{ productId: item.id, quantity: 1 }], performedBy });

    const closedShift = await closeShift({ shiftId: shift.id, countedCash: 1000, closedBy: performedBy });
    // Only the starting float — the ₱100 sitting on the open tab isn't cash in the drawer yet.
    expect(Number(closedShift.expectedCash)).toBe(1000);
  });

  it("listOpenOrders only returns open orders for the given branch", async () => {
    const branchA = await createTestBranch();
    const branchB = await createTestBranch();

    const orderA = await createOpenOrder({ branchId: branchA.id, performedBy });
    await createOpenOrder({ branchId: branchB.id, performedBy });
    const orderAClosedLater = await createOpenOrder({ branchId: branchA.id, performedBy });
    await voidEmptyOrder({ orderId: orderAClosedLater.id });

    const openForA = await listOpenOrders(branchA.id);
    expect(openForA.map((o) => o.id)).toEqual([orderA.id]);
  });
});
