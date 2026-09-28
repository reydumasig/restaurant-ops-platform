import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockRawMaterials, stockLedgerRawMaterials } from "@/db/schema";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { approveCompReport, createCompReport, rejectCompReport } from "@/server/lib/comps";
import { createTestBranch, createTestRawMaterial, createTestUser } from "../helpers/fixtures";

describe("comp reports", () => {
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

  it("reporting a comp does not touch stock — only approval does", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createCompReport({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      quantity: 20,
      reason: "staff_perk",
      notes: "End-of-shift meal for the closing crew",
      reportedBy,
    });

    expect(report.status).toBe("pending");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(100); // unchanged
  });

  it("approving deducts stock through the ledger, tagged comp_writeoff", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createCompReport({
      branchId: branch.id,
      itemType: "raw_material",
      itemId: rice.id,
      quantity: 20,
      reason: "customer_comp",
      reportedBy,
    });

    const approved = await approveCompReport({ compReportId: report.id, reviewedBy, reviewNotes: "Regular customer, birthday freebie" });

    expect(approved.status).toBe("approved");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(80);

    const [ledgerRow] = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(
        and(
          eq(stockLedgerRawMaterials.branchId, branch.id),
          eq(stockLedgerRawMaterials.rawMaterialId, rice.id),
          eq(stockLedgerRawMaterials.movementType, "comp_writeoff"),
        ),
      );
    expect(ledgerRow).toBeDefined();
    expect(Number(ledgerRow.quantityDelta)).toBe(-20);
  });

  it("rejecting leaves stock untouched and records the reviewer's note", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createCompReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 20, reason: "promo_giveaway", reportedBy });
    const rejected = await rejectCompReport({ compReportId: report.id, reviewedBy, reviewNotes: "Not an approved promo, recheck with owner" });

    expect(rejected.status).toBe("rejected");
    expect(rejected.reviewNotes).toBe("Not an approved promo, recheck with owner");
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(100);
  });

  it("refuses to approve a report twice, and refuses to approve past insufficient stock", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createCompReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 20, reason: "staff_perk", reportedBy });
    await approveCompReport({ compReportId: report.id, reviewedBy });

    await expect(approveCompReport({ compReportId: report.id, reviewedBy })).rejects.toThrow("Comp report is already approved");

    const overReport = await createCompReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 90, reason: "customer_comp", reportedBy });
    await expect(approveCompReport({ compReportId: overReport.id, reviewedBy })).rejects.toThrow(InsufficientStockError);
    expect(await rawMaterialStockOf(branch.id, rice.id)).toBe(80); // unaffected by the failed approval
  });

  it("refuses to reject an already-approved report", async () => {
    const branch = await createTestBranch();
    const rice = await createTestRawMaterial();
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, movementType: "stock_in", quantityDelta: 100, performedBy: reportedBy });

    const report = await createCompReport({ branchId: branch.id, itemType: "raw_material", itemId: rice.id, quantity: 20, reason: "staff_perk", reportedBy });
    await approveCompReport({ compReportId: report.id, reviewedBy });

    await expect(rejectCompReport({ compReportId: report.id, reviewedBy })).rejects.toThrow("Comp report is already approved");
  });
});
