import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { unitsOfMeasure } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import type { AuthVariables } from "@/server/middleware/auth";

export const unitsRoute = new Hono<{ Variables: AuthVariables }>();

const unitInput = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
});

unitsRoute.get("/", async (c) => {
  const rows = await db.select().from(unitsOfMeasure).orderBy(unitsOfMeasure.name);
  return c.json(rows);
});

unitsRoute.post("/", requireRole("owner", "admin"), zValidator("json", unitInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [created] = await db.insert(unitsOfMeasure).values(input).returning();
  await recordAudit({ actorId: authUser.id, action: "create", entityType: "unit_of_measure", entityId: created.id, after: created });

  return c.json(created, 201);
});

unitsRoute.patch("/:id", requireRole("owner", "admin"), zValidator("json", unitInput.partial()), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(unitsOfMeasure).set(input).where(eq(unitsOfMeasure.id, id)).returning();
  await recordAudit({ actorId: authUser.id, action: "update", entityType: "unit_of_measure", entityId: id, before, after: updated });

  return c.json(updated);
});
