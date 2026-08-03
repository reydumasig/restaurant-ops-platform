import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import type { AuthVariables } from "@/server/middleware/auth";

export const branchesRoute = new Hono<{ Variables: AuthVariables }>();

const branchInput = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["commissary", "branch"]),
  address: z.string().optional(),
});

branchesRoute.get("/", async (c) => {
  const rows = await db.select().from(branches).orderBy(branches.name);
  return c.json(rows);
});

branchesRoute.get("/:id", async (c) => {
  const [row] = await db.select().from(branches).where(eq(branches.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

branchesRoute.post("/", requireRole("owner", "admin"), zValidator("json", branchInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [created] = await db.insert(branches).values(input).returning();
  await recordAudit({ actorId: authUser.id, action: "create", entityType: "branch", entityId: created.id, after: created });

  return c.json(created, 201);
});

branchesRoute.patch("/:id", requireRole("owner", "admin"), zValidator("json", branchInput.partial()), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(branches).set(input).where(eq(branches.id, id)).returning();
  await recordAudit({ actorId: authUser.id, action: "update", entityType: "branch", entityId: id, before, after: updated });

  return c.json(updated);
});

branchesRoute.patch("/:id/active", requireRole("owner", "admin"), zValidator("json", z.object({ active: z.boolean() })), async (c) => {
  const id = c.req.param("id");
  const { active } = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(branches).set({ active }).where(eq(branches.id, id)).returning();
  await recordAudit({
    actorId: authUser.id,
    action: active ? "reactivate" : "deactivate",
    entityType: "branch",
    entityId: id,
    before,
    after: updated,
  });

  return c.json(updated);
});
