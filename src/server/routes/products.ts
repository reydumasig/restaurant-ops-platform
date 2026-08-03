import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import type { AuthVariables } from "@/server/middleware/auth";

export const productsRoute = new Hono<{ Variables: AuthVariables }>();

const productInput = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  unitId: z.string().uuid(),
  price: z.coerce.number().nonnegative(),
});

productsRoute.get("/", async (c) => {
  const rows = await db.select().from(products).orderBy(products.name);
  return c.json(rows);
});

productsRoute.get("/:id", async (c) => {
  const [row] = await db.select().from(products).where(eq(products.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

productsRoute.post("/", requireRole("owner", "admin"), zValidator("json", productInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [created] = await db
    .insert(products)
    .values({ ...input, price: String(input.price) })
    .returning();
  await recordAudit({ actorId: authUser.id, action: "create", entityType: "product", entityId: created.id, after: created });

  return c.json(created, 201);
});

productsRoute.patch("/:id", requireRole("owner", "admin"), zValidator("json", productInput.partial()), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db
    .update(products)
    .set({ ...input, price: input.price != null ? String(input.price) : undefined })
    .where(eq(products.id, id))
    .returning();
  await recordAudit({ actorId: authUser.id, action: "update", entityType: "product", entityId: id, before, after: updated });

  return c.json(updated);
});

productsRoute.patch("/:id/active", requireRole("owner", "admin"), zValidator("json", z.object({ active: z.boolean() })), async (c) => {
  const id = c.req.param("id");
  const { active } = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(products).set({ active }).where(eq(products.id, id)).returning();
  await recordAudit({
    actorId: authUser.id,
    action: active ? "reactivate" : "deactivate",
    entityType: "product",
    entityId: id,
    before,
    after: updated,
  });

  return c.json(updated);
});
