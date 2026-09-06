import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rawMaterials } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import { getPriceHistory } from "@/server/lib/purchasing";
import type { AuthVariables } from "@/server/middleware/auth";

export const rawMaterialsRoute = new Hono<{ Variables: AuthVariables }>();

const rawMaterialInput = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  unitId: z.string().uuid(),
  costPerUnit: z.coerce.number().nonnegative(),
  reorderPoint: z.coerce.number().nonnegative(),
  purchaseUnitLabel: z.string().optional().nullable(),
  purchaseUnitConversionFactor: z.coerce.number().positive().optional().nullable(),
});

rawMaterialsRoute.get("/", async (c) => {
  const rows = await db.select().from(rawMaterials).orderBy(rawMaterials.name);
  return c.json(rows);
});

rawMaterialsRoute.get("/:id", async (c) => {
  const [row] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

rawMaterialsRoute.get("/:id/price-history", async (c) => {
  const rows = await getPriceHistory({ rawMaterialId: c.req.param("id") });
  return c.json(rows);
});

rawMaterialsRoute.post("/", requireRole("owner", "admin"), zValidator("json", rawMaterialInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [created] = await db
    .insert(rawMaterials)
    .values({
      ...input,
      costPerUnit: String(input.costPerUnit),
      reorderPoint: String(input.reorderPoint),
      purchaseUnitConversionFactor:
        input.purchaseUnitConversionFactor != null ? String(input.purchaseUnitConversionFactor) : null,
    })
    .returning();
  await recordAudit({ actorId: authUser.id, action: "create", entityType: "raw_material", entityId: created.id, after: created });

  return c.json(created, 201);
});

rawMaterialsRoute.patch("/:id", requireRole("owner", "admin"), zValidator("json", rawMaterialInput.partial()), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db
    .update(rawMaterials)
    .set({
      ...input,
      costPerUnit: input.costPerUnit != null ? String(input.costPerUnit) : undefined,
      reorderPoint: input.reorderPoint != null ? String(input.reorderPoint) : undefined,
      purchaseUnitConversionFactor:
        input.purchaseUnitConversionFactor !== undefined
          ? input.purchaseUnitConversionFactor != null
            ? String(input.purchaseUnitConversionFactor)
            : null
          : undefined,
    })
    .where(eq(rawMaterials.id, id))
    .returning();
  await recordAudit({ actorId: authUser.id, action: "update", entityType: "raw_material", entityId: id, before, after: updated });

  return c.json(updated);
});

rawMaterialsRoute.patch("/:id/active", requireRole("owner", "admin"), zValidator("json", z.object({ active: z.boolean() })), async (c) => {
  const id = c.req.param("id");
  const { active } = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(rawMaterials).set({ active }).where(eq(rawMaterials.id, id)).returning();
  await recordAudit({
    actorId: authUser.id,
    action: active ? "reactivate" : "deactivate",
    entityType: "raw_material",
    entityId: id,
    before,
    after: updated,
  });

  return c.json(updated);
});
