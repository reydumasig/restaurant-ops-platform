import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { posSales, posShifts } from "@/db/schema";

export async function getOpenShift(branchId: string) {
  const [shift] = await db
    .select()
    .from(posShifts)
    .where(and(eq(posShifts.branchId, branchId), eq(posShifts.status, "open")))
    .limit(1);
  return shift ?? null;
}

export async function openShift(params: { branchId: string; startingCash: number; openedBy: string }) {
  const { branchId, startingCash, openedBy } = params;

  const existing = await getOpenShift(branchId);
  if (existing) throw new Error("This branch already has an open shift");

  // The partial unique index (pos_shifts_one_open_per_branch) is the real
  // guarantee under concurrency — this pre-check is just a friendlier
  // error message for the common, non-racing case.
  const [shift] = await db
    .insert(posShifts)
    .values({ branchId, startingCash: String(startingCash), openedBy })
    .returning();
  return shift;
}

export async function getShiftWithSales(shiftId: string) {
  const [shift] = await db.select().from(posShifts).where(eq(posShifts.id, shiftId)).limit(1);
  if (!shift) return null;
  const sales = await db.select().from(posSales).where(eq(posSales.shiftId, shiftId)).orderBy(desc(posSales.importedAt));
  return { shift, sales };
}

export async function listShifts(branchId: string | null) {
  if (!branchId) return db.select().from(posShifts).orderBy(desc(posShifts.openedAt));
  return db.select().from(posShifts).where(eq(posShifts.branchId, branchId)).orderBy(desc(posShifts.openedAt));
}

export async function closeShift(params: { shiftId: string; countedCash: number; closedBy: string; notes?: string }) {
  const { shiftId, countedCash, closedBy, notes } = params;

  return db.transaction(async (tx) => {
    const [shift] = await tx.select().from(posShifts).where(eq(posShifts.id, shiftId)).limit(1).for("update");
    if (!shift) throw new Error("Shift not found");
    if (shift.status !== "open") throw new Error("Shift is already closed");

    const salesRows = await tx.select({ totalAmount: posSales.totalAmount }).from(posSales).where(eq(posSales.shiftId, shiftId));
    const salesTotal = salesRows.reduce((sum, r) => sum + Number(r.totalAmount), 0);
    const expectedCash = Number(shift.startingCash) + salesTotal;
    const cashVariance = countedCash - expectedCash;

    const [updated] = await tx
      .update(posShifts)
      .set({
        status: "closed",
        closedBy,
        closedAt: new Date(),
        countedCash: String(countedCash),
        expectedCash: String(expectedCash),
        cashVariance: String(cashVariance),
        notes,
      })
      .where(eq(posShifts.id, shiftId))
      .returning();

    return updated;
  });
}
