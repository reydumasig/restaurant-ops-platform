import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockRawMaterials, stockTransferItemsRawMaterials, stockTransfers } from "@/db/schema";
import { getBatchesForItem } from "@/server/lib/batches";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { approveTransferRequest, cancelTransfer, confirmReceipt, createTransfer, rejectTransferRequest, requestTransfer } from "@/server/lib/transfers";
import { createTestBranch, createTestRawMaterial, createTestUser } from "../helpers/fixtures";

describe("stock transfers", () => {
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

  it("deducts the source branch immediately on creation, before any receipt", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });

    expect(await rawMaterialStockOf(from.id, rice.id)).toBe(60);
    expect(await rawMaterialStockOf(to.id, rice.id)).toBe(0);
  });

  it("credits the destination on full receipt and marks the transfer received", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    const transfer = await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });
    const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, transfer.id));

    const updated = await confirmReceipt({
      transferId: transfer.id,
      receivedBy: performedBy,
      rawMaterialReceipts: [{ id: line.id, quantityReceived: 40 }],
      productReceipts: [],
    });

    expect(updated.status).toBe("received");
    expect(await rawMaterialStockOf(to.id, rice.id)).toBe(40);
  });

  it("rejects a receipt greater than what was sent, and leaves the transfer untouched", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    const transfer = await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });
    const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, transfer.id));

    // Sent only 40, but the receiving form is fed 400 — without a server-side
    // cap this used to silently manufacture 360 units of stock from nothing.
    await expect(
      confirmReceipt({
        transferId: transfer.id,
        receivedBy: performedBy,
        rawMaterialReceipts: [{ id: line.id, quantityReceived: 400 }],
        productReceipts: [],
      }),
    ).rejects.toThrow("Received quantity cannot exceed the quantity sent");

    expect(await rawMaterialStockOf(to.id, rice.id)).toBe(0);
    const [transferRow] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, transfer.id));
    expect(transferRow.status).toBe("in_transit");
    const [lineAfter] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.id, line.id));
    expect(lineAfter.quantityReceived).toBeNull();
  });

  it("allows a partial receipt (Phase 1 has no discrepancy workflow — the shortfall is simply not credited anywhere)", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    const transfer = await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });
    const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, transfer.id));

    await confirmReceipt({
      transferId: transfer.id,
      receivedBy: performedBy,
      rawMaterialReceipts: [{ id: line.id, quantityReceived: 35 }],
      productReceipts: [],
    });

    expect(await rawMaterialStockOf(from.id, rice.id)).toBe(60);
    expect(await rawMaterialStockOf(to.id, rice.id)).toBe(35);
  });

  it("returns the full sent quantity to the source branch on cancellation", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

    const transfer = await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });
    expect(await rawMaterialStockOf(from.id, rice.id)).toBe(60);

    const cancelled = await cancelTransfer({ transferId: transfer.id, cancelledBy: performedBy });
    expect(cancelled.status).toBe("cancelled");
    expect(await rawMaterialStockOf(from.id, rice.id)).toBe(100);
  });

  it("preserves the shipped batch's expiry date at the destination branch on receipt", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({
      branchId: from.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 100,
      performedBy,
      batchExpiryDate: "2026-10-15",
    });

    const transfer = await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });
    const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, transfer.id));

    await confirmReceipt({
      transferId: transfer.id,
      receivedBy: performedBy,
      rawMaterialReceipts: [{ id: line.id, quantityReceived: 40 }],
      productReceipts: [],
    });

    const destBatches = await getBatchesForItem({ branchId: to.id, rawMaterialId: rice.id });
    expect(destBatches).toHaveLength(1);
    expect(destBatches[0].expiryDate).toBe("2026-10-15");
    expect(Number(destBatches[0].quantityRemaining)).toBe(40);
    expect(destBatches[0].sourceType).toBe("transfer_in");
  });

  it("splits a partial receipt proportionally across whatever distinct batches were shipped", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    // Two distinct source batches with different expiries.
    await applyStockMovement({
      branchId: from.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 30,
      performedBy,
      batchExpiryDate: "2026-09-10",
    });
    await applyStockMovement({
      branchId: from.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 30,
      performedBy,
      batchExpiryDate: "2026-12-31",
    });

    // FEFO draws 30 from the sooner-expiring batch + 10 from the later one.
    const transfer = await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });
    const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, transfer.id));

    // Destination only receives half of what was shipped — a partial receipt.
    await confirmReceipt({
      transferId: transfer.id,
      receivedBy: performedBy,
      rawMaterialReceipts: [{ id: line.id, quantityReceived: 20 }],
      productReceipts: [],
    });

    const destBatches = await getBatchesForItem({ branchId: to.id, rawMaterialId: rice.id });
    expect(destBatches).toHaveLength(2);
    const soon = destBatches.find((b) => b.expiryDate === "2026-09-10")!;
    const later = destBatches.find((b) => b.expiryDate === "2026-12-31")!;
    expect(Number(soon.quantityRemaining)).toBeCloseTo(15); // 30 shipped * (20/40 received)
    expect(Number(later.quantityRemaining)).toBeCloseTo(5); // 10 shipped * (20/40 received)
  });

  it("preserves the original expiry when a cancelled transfer returns stock to the source", async () => {
    const from = await createTestBranch("commissary");
    const to = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({
      branchId: from.id,
      itemType: "raw_material",
      itemId: rice.id,
      movementType: "stock_in",
      quantityDelta: 100,
      performedBy,
      batchExpiryDate: "2026-11-01",
    });

    const transfer = await createTransfer({
      fromBranchId: from.id,
      toBranchId: to.id,
      createdBy: performedBy,
      items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
    });
    await cancelTransfer({ transferId: transfer.id, cancelledBy: performedBy });

    const sourceBatches = await getBatchesForItem({ branchId: from.id, rawMaterialId: rice.id });
    const withExpiry = sourceBatches.filter((b) => b.expiryDate === "2026-11-01");
    const totalRemaining = withExpiry.reduce((sum, b) => sum + Number(b.quantityRemaining), 0);
    expect(totalRemaining).toBe(100); // 60 untouched + 40 restored, same expiry preserved throughout
  });

  describe("branch-initiated requests", () => {
    it("records the request with no stock movement — nothing ships until approved", async () => {
      const from = await createTestBranch("commissary");
      const to = await createTestBranch();
      const rice = await createTestRawMaterial();
      await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

      const requested = await requestTransfer({
        fromBranchId: from.id,
        toBranchId: to.id,
        requestedBy: performedBy,
        items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
      });

      expect(requested.status).toBe("pending");
      expect(await rawMaterialStockOf(from.id, rice.id)).toBe(100); // untouched
      const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, requested.id));
      expect(Number(line.quantityRequested)).toBe(40);
      expect(line.quantitySent).toBeNull();
    });

    it("approving dispatches exactly what the commissary chooses to send, which can differ from what was requested", async () => {
      const from = await createTestBranch("commissary");
      const to = await createTestBranch();
      const rice = await createTestRawMaterial();
      await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

      const requested = await requestTransfer({
        fromBranchId: from.id,
        toBranchId: to.id,
        requestedBy: performedBy,
        items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
      });
      const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, requested.id));

      // Commissary only has enough to send 25, not the full 40 requested.
      const approved = await approveTransferRequest({
        transferId: requested.id,
        approvedBy: performedBy,
        rawMaterialLines: [{ id: line.id, quantityToSend: 25 }],
        productLines: [],
      });

      expect(approved.status).toBe("in_transit");
      expect(await rawMaterialStockOf(from.id, rice.id)).toBe(75);
      const [lineAfter] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.id, line.id));
      expect(Number(lineAfter.quantityRequested)).toBe(40);
      expect(Number(lineAfter.quantitySent)).toBe(25);
    });

    it("refuses to approve past what the source branch actually has", async () => {
      const from = await createTestBranch("commissary");
      const to = await createTestBranch();
      const rice = await createTestRawMaterial();
      await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 10, performedBy });

      const requested = await requestTransfer({
        fromBranchId: from.id,
        toBranchId: to.id,
        requestedBy: performedBy,
        items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
      });
      const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, requested.id));

      await expect(
        approveTransferRequest({
          transferId: requested.id,
          approvedBy: performedBy,
          rawMaterialLines: [{ id: line.id, quantityToSend: 40 }],
          productLines: [],
        }),
      ).rejects.toThrow(InsufficientStockError);
      expect(await rawMaterialStockOf(from.id, rice.id)).toBe(10); // unaffected by the failed approval
    });

    it("rejecting a request leaves stock untouched and never dispatches", async () => {
      const from = await createTestBranch("commissary");
      const to = await createTestBranch();
      const rice = await createTestRawMaterial();
      await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

      const requested = await requestTransfer({
        fromBranchId: from.id,
        toBranchId: to.id,
        requestedBy: performedBy,
        items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
      });

      const rejected = await rejectTransferRequest({ transferId: requested.id, rejectedBy: performedBy });
      expect(rejected.status).toBe("cancelled");
      expect(await rawMaterialStockOf(from.id, rice.id)).toBe(100);
    });

    it("an approved request can then be received exactly like a pushed transfer", async () => {
      const from = await createTestBranch("commissary");
      const to = await createTestBranch();
      const rice = await createTestRawMaterial();
      await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

      const requested = await requestTransfer({
        fromBranchId: from.id,
        toBranchId: to.id,
        requestedBy: performedBy,
        items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
      });
      const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, requested.id));
      await approveTransferRequest({
        transferId: requested.id,
        approvedBy: performedBy,
        rawMaterialLines: [{ id: line.id, quantityToSend: 40 }],
        productLines: [],
      });

      const received = await confirmReceipt({
        transferId: requested.id,
        receivedBy: performedBy,
        rawMaterialReceipts: [{ id: line.id, quantityReceived: 40 }],
        productReceipts: [],
      });

      expect(received.status).toBe("received");
      expect(await rawMaterialStockOf(to.id, rice.id)).toBe(40);
    });

    it("refuses to approve or reject a request twice", async () => {
      const from = await createTestBranch("commissary");
      const to = await createTestBranch();
      const rice = await createTestRawMaterial();
      await applyStockMovement({ branchId: from.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy });

      const requested = await requestTransfer({
        fromBranchId: from.id,
        toBranchId: to.id,
        requestedBy: performedBy,
        items: [{ itemType: "raw_material", itemId: rice.id, quantity: 40 }],
      });
      const [line] = await db.select().from(stockTransferItemsRawMaterials).where(eq(stockTransferItemsRawMaterials.transferId, requested.id));

      await approveTransferRequest({
        transferId: requested.id,
        approvedBy: performedBy,
        rawMaterialLines: [{ id: line.id, quantityToSend: 40 }],
        productLines: [],
      });

      await expect(
        approveTransferRequest({ transferId: requested.id, approvedBy: performedBy, rawMaterialLines: [], productLines: [] }),
      ).rejects.toThrow("Transfer is already in_transit");
      await expect(rejectTransferRequest({ transferId: requested.id, rejectedBy: performedBy })).rejects.toThrow(
        "Transfer is already in_transit",
      );
    });
  });
});
