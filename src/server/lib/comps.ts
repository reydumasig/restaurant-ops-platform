import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { compReports } from "@/db/schema";
import { applyStockMovement, type ItemType } from "@/server/lib/inventory";

export type CompReason = "staff_perk" | "customer_comp" | "promo_giveaway";

export async function createCompReport(params: {
  branchId: string;
  itemType: ItemType;
  itemId: string;
  quantity: number;
  reason: CompReason;
  notes?: string;
  reportedBy: string;
}) {
  const { branchId, itemType, itemId, quantity, reason, notes, reportedBy } = params;

  const [report] = await db
    .insert(compReports)
    .values({
      branchId,
      itemType,
      rawMaterialId: itemType === "raw_material" ? itemId : null,
      productId: itemType === "product" ? itemId : null,
      quantity: String(quantity),
      reason,
      notes,
      reportedBy,
    })
    .returning();

  return report;
}

export async function listCompReports(params: { branchId: string | null; status?: "pending" | "approved" | "rejected" }) {
  const { branchId, status } = params;
  return db
    .select()
    .from(compReports)
    .where(and(branchId ? eq(compReports.branchId, branchId) : undefined, status ? eq(compReports.status, status) : undefined))
    .orderBy(desc(compReports.createdAt));
}

export async function getCompReport(id: string) {
  const [report] = await db.select().from(compReports).where(eq(compReports.id, id)).limit(1);
  return report ?? null;
}

export async function approveCompReport(params: { compReportId: string; reviewedBy: string; reviewNotes?: string }) {
  const { compReportId, reviewedBy, reviewNotes } = params;

  return db.transaction(async (tx) => {
    const [report] = await tx.select().from(compReports).where(eq(compReports.id, compReportId)).limit(1);
    if (!report) throw new Error("Comp report not found");
    if (report.status !== "pending") throw new Error(`Comp report is already ${report.status}`);

    const itemId = report.itemType === "raw_material" ? report.rawMaterialId! : report.productId!;

    await applyStockMovement(
      {
        branchId: report.branchId,
        itemType: report.itemType as ItemType,
        itemId,
        movementType: "comp_writeoff",
        quantityDelta: -Number(report.quantity),
        performedBy: reviewedBy,
        referenceType: "comp_report",
        referenceId: report.id,
        notes: report.reason,
      },
      tx,
    );

    const [updated] = await tx
      .update(compReports)
      .set({ status: "approved", reviewedBy, reviewNotes, reviewedAt: new Date() })
      .where(eq(compReports.id, compReportId))
      .returning();

    return updated;
  });
}

export async function rejectCompReport(params: { compReportId: string; reviewedBy: string; reviewNotes?: string }) {
  const { compReportId, reviewedBy, reviewNotes } = params;

  return db.transaction(async (tx) => {
    const [report] = await tx.select().from(compReports).where(eq(compReports.id, compReportId)).limit(1);
    if (!report) throw new Error("Comp report not found");
    if (report.status !== "pending") throw new Error(`Comp report is already ${report.status}`);

    const [updated] = await tx
      .update(compReports)
      .set({ status: "rejected", reviewedBy, reviewNotes, reviewedAt: new Date() })
      .where(eq(compReports.id, compReportId))
      .returning();

    return updated;
  });
}
