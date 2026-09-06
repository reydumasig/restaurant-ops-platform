import { beforeAll, describe, expect, it } from "vitest";
import { closeShift, getOpenShift, openShift } from "@/server/lib/pos-shifts";
import { applyStockMovement } from "@/server/lib/inventory";
import { createSale } from "@/server/lib/pos";
import { createTestBranch, createTestProduct, createTestUser } from "../helpers/fixtures";

describe("POS shift management", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  it("opens a shift with the given starting cash, and refuses a second open shift for the same branch", async () => {
    const branch = await createTestBranch();

    const shift = await openShift({ branchId: branch.id, startingCash: 2000, openedBy: performedBy });
    expect(shift.status).toBe("open");
    expect(Number(shift.startingCash)).toBe(2000);

    await expect(openShift({ branchId: branch.id, startingCash: 1000, openedBy: performedBy })).rejects.toThrow(
      "This branch already has an open shift",
    );

    expect((await getOpenShift(branch.id))?.id).toBe(shift.id);
  });

  it("tags sales made while a shift is open, and leaves sales untagged when no shift is open", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 50 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 20, performedBy });

    // No shift open yet — sale should be untagged.
    const untaggedSale = await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 1 }], discountType: "none", tenderedAmount: 50, performedBy });
    expect(untaggedSale.shiftId).toBeNull();

    const shift = await openShift({ branchId: branch.id, startingCash: 1000, openedBy: performedBy });
    const taggedSale = await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 2 }], discountType: "none", tenderedAmount: 100, performedBy });
    expect(taggedSale.shiftId).toBe(shift.id);
  });

  it("computes expected cash as starting float + shift sales, and reports variance against what was counted", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 100 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 20, performedBy });

    const shift = await openShift({ branchId: branch.id, startingCash: 1000, openedBy: performedBy });
    await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 1 }], discountType: "none", tenderedAmount: 100, performedBy });
    await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 2 }], discountType: "none", tenderedAmount: 200, performedBy });
    // Expected cash: 1000 starting + 300 in sales = 1300.

    const closed = await closeShift({ shiftId: shift.id, countedCash: 1280, closedBy: performedBy, notes: "short by 20" });
    expect(closed.status).toBe("closed");
    expect(Number(closed.expectedCash)).toBe(1300);
    expect(Number(closed.countedCash)).toBe(1280);
    expect(Number(closed.cashVariance)).toBe(-20);

    expect(await getOpenShift(branch.id)).toBeNull();
  });

  it("rejects closing a shift twice, and a sale made after close is untagged (no open shift to attach to)", async () => {
    const branch = await createTestBranch();
    const product = await createTestProduct({ price: 30 });
    await applyStockMovement({ branchId: branch.id, itemType: "product", itemId: product.id, movementType: "stock_in", quantityDelta: 20, performedBy });

    const shift = await openShift({ branchId: branch.id, startingCash: 500, openedBy: performedBy });
    await closeShift({ shiftId: shift.id, countedCash: 500, closedBy: performedBy });

    await expect(closeShift({ shiftId: shift.id, countedCash: 500, closedBy: performedBy })).rejects.toThrow("Shift is already closed");

    const saleAfterClose = await createSale({ branchId: branch.id, lines: [{ productId: product.id, quantity: 1 }], discountType: "none", tenderedAmount: 30, performedBy });
    expect(saleAfterClose.shiftId).toBeNull();
  });

  it("allows opening a new shift for the same branch after the previous one is closed", async () => {
    const branch = await createTestBranch();
    const first = await openShift({ branchId: branch.id, startingCash: 500, openedBy: performedBy });
    await closeShift({ shiftId: first.id, countedCash: 500, closedBy: performedBy });

    const second = await openShift({ branchId: branch.id, startingCash: 750, openedBy: performedBy });
    expect(second.status).toBe("open");
    expect(second.id).not.toBe(first.id);
  });
});
