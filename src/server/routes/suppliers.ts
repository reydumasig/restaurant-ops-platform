import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { suppliers } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import { getSupplierPriceHistory } from "@/server/lib/purchasing";
import type { AuthVariables } from "@/server/middleware/auth";

export const suppliersRoute = new Hono<{ Variables: AuthVariables }>();

const supplierInput = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

suppliersRoute.get("/", async (c) => {
  const rows = await db.select().from(suppliers).orderBy(suppliers.name);
  return c.json(rows);
});

suppliersRoute.get("/:id", async (c) => {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

suppliersRoute.get("/:id/price-history", async (c) => {
  const rows = await getSupplierPriceHistory({ supplierId: c.req.param("id") });
  return c.json(rows);
});

suppliersRoute.post("/", requireRole("owner", "admin"), zValidator("json", supplierInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [created] = await db
    .insert(suppliers)
    .values({ ...input, contactEmail: input.contactEmail || null })
    .returning();
  await recordAudit({ actorId: authUser.id, action: "create", entityType: "supplier", entityId: created.id, after: created });

  return c.json(created, 201);
});

suppliersRoute.patch("/:id", requireRole("owner", "admin"), zValidator("json", supplierInput.partial()), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db
    .update(suppliers)
    .set({ ...input, contactEmail: input.contactEmail || undefined })
    .where(eq(suppliers.id, id))
    .returning();
  await recordAudit({ actorId: authUser.id, action: "update", entityType: "supplier", entityId: id, before, after: updated });

  return c.json(updated);
});

suppliersRoute.patch("/:id/active", requireRole("owner", "admin"), zValidator("json", z.object({ active: z.boolean() })), async (c) => {
  const id = c.req.param("id");
  const { active } = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(suppliers).set({ active }).where(eq(suppliers.id, id)).returning();
  await recordAudit({
    actorId: authUser.id,
    action: active ? "reactivate" : "deactivate",
    entityType: "supplier",
    entityId: id,
    before,
    after: updated,
  });

  return c.json(updated);
});
