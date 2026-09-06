import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { wasteReports } from "@/db/schema";
import { applyStockMovement, type ItemType } from "@/server/lib/inventory";

export type WasteReason = "spoilage" | "damage" | "expiry";

export async function createWasteReport(params: {
  branchId: string;
  itemType: ItemType;
  itemId: string;
  quantity: number;
  reason: WasteReason;
  notes?: string;
  reportedBy: string;
}) {
  const { branchId, itemType, itemId, quantity, reason, notes, reportedBy } = params;

  const [report] = await db
    .insert(wasteReports)
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

export async function listWasteReports(params: { branchId: string | null; status?: "pending" | "approved" | "rejected" }) {
  const { branchId, status } = params;
  return db
    .select()
    .from(wasteReports)
    .where(and(branchId ? eq(wasteReports.branchId, branchId) : undefined, status ? eq(wasteReports.status, status) : undefined))
    .orderBy(desc(wasteReports.createdAt));
}

export async function getWasteReport(id: string) {
  const [report] = await db.select().from(wasteReports).where(eq(wasteReports.id, id)).limit(1);
  return report ?? null;
}

export async function approveWasteReport(params: { wasteReportId: string; reviewedBy: string; reviewNotes?: string }) {
  const { wasteReportId, reviewedBy, reviewNotes } = params;

  return db.transaction(async (tx) => {
    const [report] = await tx.select().from(wasteReports).where(eq(wasteReports.id, wasteReportId)).limit(1);
    if (!report) throw new Error("Waste report not found");
    if (report.status !== "pending") throw new Error(`Waste report is already ${report.status}`);

    const itemId = report.itemType === "raw_material" ? report.rawMaterialId! : report.productId!;

    await applyStockMovement(
      {
        branchId: report.branchId,
        itemType: report.itemType as ItemType,
        itemId,
        movementType: "waste_writeoff",
        quantityDelta: -Number(report.quantity),
        performedBy: reviewedBy,
        referenceType: "waste_report",
        referenceId: report.id,
        notes: report.reason,
      },
      tx,
    );

    const [updated] = await tx
      .update(wasteReports)
      .set({ status: "approved", reviewedBy, reviewNotes, reviewedAt: new Date() })
      .where(eq(wasteReports.id, wasteReportId))
      .returning();

    return updated;
  });
}

export async function rejectWasteReport(params: { wasteReportId: string; reviewedBy: string; reviewNotes?: string }) {
  const { wasteReportId, reviewedBy, reviewNotes } = params;

  return db.transaction(async (tx) => {
    const [report] = await tx.select().from(wasteReports).where(eq(wasteReports.id, wasteReportId)).limit(1);
    if (!report) throw new Error("Waste report not found");
    if (report.status !== "pending") throw new Error(`Waste report is already ${report.status}`);

    const [updated] = await tx
      .update(wasteReports)
      .set({ status: "rejected", reviewedBy, reviewNotes, reviewedAt: new Date() })
      .where(eq(wasteReports.id, wasteReportId))
      .returning();

    return updated;
  });
}
