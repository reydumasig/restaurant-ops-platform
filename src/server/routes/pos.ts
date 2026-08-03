import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, products, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped } from "@/server/lib/rbac";
import { createSale, getDailySalesReport, getSalesSummary, getSaleWithItems, InsufficientStockError, listSales } from "@/server/lib/pos";
import type { AuthVariables } from "@/server/middleware/auth";

export const posRoute = new Hono<{ Variables: AuthVariables }>();

const saleInput = z.object({
  branchId: z.string().uuid(),
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().positive() })).min(1),
  discountType: z.enum(["none", "senior_pwd"]).default("none"),
  tenderedAmount: z.coerce.number().nonnegative(),
});

posRoute.post(
  "/sales",
  requireRole("owner", "admin", "commissary_staff", "branch_manager", "branch_staff"),
  zValidator("json", saleInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const sale = await createSale({
        branchId: input.branchId,
        lines: input.lines,
        discountType: input.discountType,
        tenderedAmount: input.tenderedAmount,
        performedBy: authUser.id,
      });
      return c.json(sale, 201);
    } catch (err) {
      if (err instanceof InsufficientStockError) return c.json({ error: err.message }, 400);
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

posRoute.get("/sales", async (c) => {
  const authUser = c.get("authUser");
  const branchId = isHqScoped(authUser) ? null : authUser.branchId;
  const rows = await listSales({ branchId });

  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));
  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  return c.json(rows.map((r) => ({ ...r, branchName: branchById.get(r.branchId), importedByName: userById.get(r.importedBy) })));
});

posRoute.get("/summary", async (c) => {
  const authUser = c.get("authUser");
  const branchId = isHqScoped(authUser) ? (c.req.query("branchId") ?? null) : authUser.branchId;
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const summary = await getSalesSummary({ branchId, date });
  return c.json(summary);
});

posRoute.get("/daily-sales-report", async (c) => {
  const authUser = c.get("authUser");
  const branchId = isHqScoped(authUser) ? (c.req.query("branchId") ?? null) : authUser.branchId;
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const rows = await getDailySalesReport({ branchId });
  return c.json(rows);
});

posRoute.get("/sales/:id", async (c) => {
  const authUser = c.get("authUser");
  const result = await getSaleWithItems(c.req.param("id"));
  if (!result) return c.json({ error: "Not found" }, 404);
  if (!canAccessBranch(authUser, result.sale.branchId)) return c.json({ error: "Forbidden" }, 403);

  const productRows = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products);
  const productById = new Map(productRows.map((p) => [p.id, p]));
  const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, result.sale.branchId)).limit(1);

  return c.json({
    sale: { ...result.sale, branchName: branch?.name },
    items: result.items.map((i) => ({ ...i, meta: productById.get(i.productId) })),
  });
});
