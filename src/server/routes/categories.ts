import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { itemCategories } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import type { AuthVariables } from "@/server/middleware/auth";

export const categoriesRoute = new Hono<{ Variables: AuthVariables }>();

const categoryInput = z.object({
  name: z.string().min(1),
  itemType: z.enum(["raw_material", "product"]),
});

categoriesRoute.get("/", async (c) => {
  const rows = await db.select().from(itemCategories).orderBy(itemCategories.itemType, itemCategories.name);
  return c.json(rows);
});

categoriesRoute.post("/", requireRole("owner", "admin"), zValidator("json", categoryInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [created] = await db.insert(itemCategories).values(input).returning();
  await recordAudit({ actorId: authUser.id, action: "create", entityType: "item_category", entityId: created.id, after: created });

  return c.json(created, 201);
});

categoriesRoute.patch("/:id", requireRole("owner", "admin"), zValidator("json", categoryInput.partial()), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(itemCategories).where(eq(itemCategories.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(itemCategories).set(input).where(eq(itemCategories.id, id)).returning();
  await recordAudit({ actorId: authUser.id, action: "update", entityType: "item_category", entityId: id, before, after: updated });

  return c.json(updated);
});
