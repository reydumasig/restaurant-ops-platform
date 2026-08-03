import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rawMaterials, recipeItems, recipes, unitsOfMeasure } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import type { AuthVariables } from "@/server/middleware/auth";

export const recipesRoute = new Hono<{ Variables: AuthVariables }>();

const recipeItemInput = z.object({
  rawMaterialId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitId: z.string().uuid(),
});

const recipeInput = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1),
  yieldQuantity: z.coerce.number().positive(),
  yieldUnitId: z.string().uuid(),
  items: z.array(recipeItemInput).min(1),
});

recipesRoute.get("/", async (c) => {
  const rows = await db.select().from(recipes).orderBy(recipes.name);
  return c.json(rows);
});

recipesRoute.get("/:id", async (c) => {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, c.req.param("id"))).limit(1);
  if (!recipe) return c.json({ error: "Not found" }, 404);

  const items = await db
    .select({
      id: recipeItems.id,
      rawMaterialId: recipeItems.rawMaterialId,
      quantity: recipeItems.quantity,
      unitId: recipeItems.unitId,
      rawMaterialName: rawMaterials.name,
      rawMaterialSku: rawMaterials.sku,
      unitAbbreviation: unitsOfMeasure.abbreviation,
    })
    .from(recipeItems)
    .innerJoin(rawMaterials, eq(recipeItems.rawMaterialId, rawMaterials.id))
    .innerJoin(unitsOfMeasure, eq(recipeItems.unitId, unitsOfMeasure.id))
    .where(eq(recipeItems.recipeId, recipe.id));

  return c.json({ recipe, items });
});

recipesRoute.post("/", requireRole("owner", "admin"), zValidator("json", recipeInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const created = await db.transaction(async (tx) => {
    const [recipe] = await tx
      .insert(recipes)
      .values({
        productId: input.productId,
        name: input.name,
        yieldQuantity: String(input.yieldQuantity),
        yieldUnitId: input.yieldUnitId,
      })
      .returning();

    for (const item of input.items) {
      await tx.insert(recipeItems).values({
        recipeId: recipe.id,
        rawMaterialId: item.rawMaterialId,
        quantity: String(item.quantity),
        unitId: item.unitId,
      });
    }

    return recipe;
  });

  await recordAudit({ actorId: authUser.id, action: "create", entityType: "recipe", entityId: created.id, after: created });
  return c.json(created, 201);
});

recipesRoute.patch(
  "/:id",
  requireRole("owner", "admin"),
  zValidator("json", recipeInput.partial()),
  async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");
    const authUser = c.get("authUser");

    const [before] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
    if (!before) return c.json({ error: "Not found" }, 404);

    const updated = await db.transaction(async (tx) => {
      const [recipe] = await tx
        .update(recipes)
        .set({
          productId: input.productId,
          name: input.name,
          yieldQuantity: input.yieldQuantity != null ? String(input.yieldQuantity) : undefined,
          yieldUnitId: input.yieldUnitId,
        })
        .where(eq(recipes.id, id))
        .returning();

      if (input.items) {
        await tx.delete(recipeItems).where(eq(recipeItems.recipeId, id));
        for (const item of input.items) {
          await tx.insert(recipeItems).values({
            recipeId: id,
            rawMaterialId: item.rawMaterialId,
            quantity: String(item.quantity),
            unitId: item.unitId,
          });
        }
      }

      return recipe;
    });

    await recordAudit({ actorId: authUser.id, action: "update", entityType: "recipe", entityId: id, before, after: updated });
    return c.json(updated);
  },
);

recipesRoute.patch("/:id/active", requireRole("owner", "admin"), zValidator("json", z.object({ active: z.boolean() })), async (c) => {
  const id = c.req.param("id");
  const { active } = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(recipes).set({ active }).where(eq(recipes.id, id)).returning();
  await recordAudit({
    actorId: authUser.id,
    action: active ? "reactivate" : "deactivate",
    entityType: "recipe",
    entityId: id,
    before,
    after: updated,
  });

  return c.json(updated);
});
