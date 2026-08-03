import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db/client";
import { products, recipes, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped } from "@/server/lib/rbac";
import { InsufficientStockError } from "@/server/lib/inventory";
import { listProductionRuns, runProduction } from "@/server/lib/production";
import type { AuthVariables } from "@/server/middleware/auth";

export const productionRoute = new Hono<{ Variables: AuthVariables }>();

productionRoute.get("/runs", async (c) => {
  const authUser = c.get("authUser");
  const branchId = isHqScoped(authUser) ? null : authUser.branchId;
  const rows = await listProductionRuns(branchId);

  const recipeRows = await db
    .select({ id: recipes.id, name: recipes.name, productId: recipes.productId })
    .from(recipes);
  const recipeById = new Map(recipeRows.map((r) => [r.id, r]));
  const productRows = await db.select({ id: products.id, name: products.name }).from(products);
  const productById = new Map(productRows.map((p) => [p.id, p.name]));
  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  return c.json(
    rows.map((r) => ({
      ...r,
      recipeName: recipeById.get(r.recipeId)?.name,
      productName: productById.get(recipeById.get(r.recipeId)?.productId ?? ""),
      producedByName: userById.get(r.producedBy),
    })),
  );
});

const runInput = z.object({
  recipeId: z.string().uuid(),
  branchId: z.string().uuid(),
  quantityProduced: z.coerce.number().positive(),
  notes: z.string().optional(),
});

productionRoute.post(
  "/runs",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", runInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const run = await runProduction({
        recipeId: input.recipeId,
        branchId: input.branchId,
        quantityProduced: input.quantityProduced,
        performedBy: authUser.id,
        notes: input.notes,
      });
      return c.json(run, 201);
    } catch (err) {
      if (err instanceof InsufficientStockError) return c.json({ error: err.message }, 400);
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);
