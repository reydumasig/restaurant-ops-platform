import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockRawMaterials, stockLedgerRawMaterials } from "@/db/schema";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { approveWasteReport, createWasteReport, rejectWasteReport } from "@/server/lib/waste";
import { createTestBranch, createTestRawMaterial, createTestUser } from "../helpers/fixtures";

describe("waste reports", () => {
  let reportedBy: string;
  let reviewedBy: string;

  beforeAll(async () => {
    reportedBy = await createTestUser();
    reviewedBy = await createTestUser();
  });

  async function rawMaterialStockOf(branchId: string, rawMaterialId: string) {
    const [row] = await db
      .select()
      .from(inventoryStockRawMaterials)
      .where(and(eq(inventoryStockRawMaterials.branchId, branchId), eq(inventoryStockRawMaterials.rawMaterialId, rawMaterialId)));
    return row ? Number(row.quantity) : 0;
  }

  it("reporting waste does not touch stock — only approval does", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createWasteReport({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      quantity: 20,
      reason: "spoilage",
      notes: "Left out overnight, visibly spoiled",
      reportedBy,
    });

    expect(report.status).toBe("pending");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(100); // unchanged
  });

  it("approving deducts stock through the ledger, tagged waste_writeoff", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createWasteReport({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      quantity: 20,
      reason: "damage",
      reportedBy,
    });

    const approved = await approveWasteReport({ wasteReportId: report.id, reviewedBy, reviewNotes: "Confirmed, sack was torn" });

    expect(approved.status).toBe("approved");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(80);

    const [ledgerRow] = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(
        and(
          eq(stockLedgerRawMaterials.branchId, branch.id),
          eq(stockLedgerRawMaterials.rawMaterialId, rice.id),
          eq(stockLedgerRawMaterials.movementType, "waste_writeoff"),
        ),
      );
    expect(ledgerRow).toBeDefined();
    expect(Number(ledgerRow.quantityDelta)).toBe(-20);
  });

  it("rejecting leaves stock untouched and records the reviewer's note", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createWasteReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 20, reason: "expiry", reportedBy });
    const rejected = await rejectWasteReport({ wasteReportId: report.id, reviewedBy, reviewNotes: "No expiry date visible, recount first" });

    expect(rejected.status).toBe("rejected");
    expect(rejected.reviewNotes).toBe("No expiry date visible, recount first");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(100);
  });

  it("refuses to approve a report twice, and refuses to approve past insufficient stock", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createWasteReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 20, reason: "spoilage", reportedBy });
    await approveWasteReport({ wasteReportId: report.id, reviewedBy });

    await expect(approveWasteReport({ wasteReportId: report.id, reviewedBy })).rejects.toThrow("Waste report is already approved");

    // A second report for more than what's left (80 in stock, reporting 90 as waste).
    const overReport = await createWasteReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 90, reason: "damage", reportedBy });
    await expect(approveWasteReport({ wasteReportId: overReport.id, reviewedBy })).rejects.toThrow(InsufficientStockError);
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(80); // unaffected by the failed approval
  });

  it("refuses to reject an already-approved report", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createWasteReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 20, reason: "spoilage", reportedBy });
    await approveWasteReport({ wasteReportId: report.id, reviewedBy });

    await expect(rejectWasteReport({ wasteReportId: report.id, reviewedBy })).rejects.toThrow("Waste report is already approved");
  });
});
