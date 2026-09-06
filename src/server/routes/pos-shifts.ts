import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped, type AuthUser } from "@/server/lib/rbac";
import { closeShift, getOpenShift, getShiftWithSales, listShifts, openShift } from "@/server/lib/pos-shifts";
import type { AuthVariables } from "@/server/middleware/auth";

export const posShiftsRoute = new Hono<{ Variables: AuthVariables }>();

function resolveBranchId(authUser: AuthUser, requested: string | undefined) {
  if (isHqScoped(authUser)) return requested ?? null;
  return authUser.branchId;
}

posShiftsRoute.get("/", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const rows = await listShifts(branchId);
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));
  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  return c.json(
    rows.map((r) => ({
      ...r,
      branchName: branchById.get(r.branchId),
      openedByName: userById.get(r.openedBy),
      closedByName: r.closedBy ? userById.get(r.closedBy) : null,
    })),
  );
});

posShiftsRoute.get("/open", async (c) => {
  const authUser = c.get("authUser");
  const branchId = c.req.query("branchId") ?? authUser.branchId;
  if (!branchId) return c.json({ error: "branchId is required" }, 400);
  if (!canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const shift = await getOpenShift(branchId);
  return c.json(shift);
});

posShiftsRoute.get("/:id", async (c) => {
  const authUser = c.get("authUser");
  const result = await getShiftWithSales(c.req.param("id"));
  if (!result) return c.json({ error: "Not found" }, 404);
  if (!canAccessBranch(authUser, result.shift.branchId)) return c.json({ error: "Forbidden" }, 403);

  const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, result.shift.branchId)).limit(1);
  return c.json({ shift: { ...result.shift, branchName: branch?.name }, sales: result.sales });
});

const openInput = z.object({
  branchId: z.string().uuid(),
  startingCash: z.coerce.number().nonnegative(),
});

posShiftsRoute.post(
  "/",
  requireRole("owner", "admin", "commissary_staff", "branch_manager", "branch_staff"),
  zValidator("json", openInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const shift = await openShift({ branchId: input.branchId, startingCash: input.startingCash, openedBy: authUser.id });
      return c.json(shift, 201);
    } catch (err) {
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

const closeInput = z.object({
  countedCash: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

posShiftsRoute.post(
  "/:id/close",
  requireRole("owner", "admin", "commissary_staff", "branch_manager", "branch_staff"),
  zValidator("json", closeInput),
  async (c) => {
    const authUser = c.get("authUser");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    const existing = await getShiftWithSales(id);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessBranch(authUser, existing.shift.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const updated = await closeShift({ shiftId: id, countedCash: input.countedCash, closedBy: authUser.id, notes: input.notes });
      return c.json(updated);
    } catch (err) {
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);
