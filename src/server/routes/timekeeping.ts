import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, users } from "@/db/schema";
import { canAccessBranch, isHqScoped, type AuthUser } from "@/server/lib/rbac";
import type { AuthVariables } from "@/server/middleware/auth";
import { computeDailyHours, getStatus, listPunches, recordPunch } from "@/server/lib/timekeeping";

export const timekeepingRoute = new Hono<{ Variables: AuthVariables }>();

function resolveBranchId(authUser: AuthUser, requested: string | undefined) {
  if (isHqScoped(authUser)) return requested ?? null;
  return authUser.branchId;
}

timekeepingRoute.get("/me/status", async (c) => {
  const authUser = c.get("authUser");
  return c.json(await getStatus(authUser.id));
});

timekeepingRoute.get("/me/punches", async (c) => {
  const authUser = c.get("authUser");
  const rows = await listPunches({ userId: authUser.id, limit: 50 });
  return c.json(rows);
});

const punchInput = z.object({
  branchId: z.string().uuid(),
  reason: z.enum(["short_break", "lunch", "end_of_shift"]).optional(),
});

timekeepingRoute.post("/punch", zValidator("json", punchInput), async (c) => {
  const authUser = c.get("authUser");
  const input = c.req.valid("json");
  if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

  try {
    const punch = await recordPunch({ userId: authUser.id, branchId: input.branchId, reason: input.reason });
    return c.json(punch, 201);
  } catch (err) {
    if (err instanceof Error) return c.json({ error: err.message }, 400);
    throw err;
  }
});

timekeepingRoute.get("/report", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);
  if (!branchId && !isHqScoped(authUser)) return c.json({ error: "branchId is required" }, 400);

  const fromParam = c.req.query("from");
  const toParam = c.req.query("to");
  const from = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : undefined;
  const to = toParam ? new Date(new Date(`${toParam}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) : undefined;

  const punches = await listPunches({ branchId: branchId ?? undefined, from, to, limit: 5000 });
  const dailyRows = computeDailyHours(punches);

  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));

  return c.json(
    dailyRows.map((r) => ({
      ...r,
      userName: userById.get(r.userId) ?? "—",
      branchName: branchById.get(r.branchId) ?? "—",
    })),
  );
});
