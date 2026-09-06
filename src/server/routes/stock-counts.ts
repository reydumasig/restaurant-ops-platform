import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, products, rawMaterials, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped, type AuthUser } from "@/server/lib/rbac";
import { InsufficientStockError } from "@/server/lib/inventory";
import {
  cancelStockCount,
  completeStockCount,
  createStockCount,
  getStockCountWithItems,
  getVarianceReport,
  listStockCounts,
} from "@/server/lib/stock-count";
import type { AuthVariables } from "@/server/middleware/auth";

export const stockCountsRoute = new Hono<{ Variables: AuthVariables }>();

function resolveBranchId(authUser: AuthUser, requested: string | undefined) {
  if (isHqScoped(authUser)) return requested ?? null;
  return authUser.branchId;
}

stockCountsRoute.get("/", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const rows = await listStockCounts(branchId);
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));
  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  return c.json(
    rows.map((r) => ({
      ...r,
      branchName: branchById.get(r.branchId),
      startedByName: userById.get(r.startedBy),
      completedByName: r.completedBy ? userById.get(r.completedBy) : null,
    })),
  );
});

stockCountsRoute.get("/variance-report", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const rows = await getVarianceReport({ branchId });

  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));
  const rmRows = await db.select({ id: rawMaterials.id, name: rawMaterials.name, sku: rawMaterials.sku }).from(rawMaterials);
  const rmById = new Map(rmRows.map((r) => [r.id, r]));
  const productRows = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products);
  const productById = new Map(productRows.map((p) => [p.id, p]));

  return c.json(
    rows.map((r) => ({
      ...r,
      branchName: branchById.get(r.branchId),
      meta: r.rawMaterialId ? rmById.get(r.rawMaterialId) : productById.get(r.productId!),
    })),
  );
});

stockCountsRoute.get("/:id", async (c) => {
  const authUser = c.get("authUser");
  const detail = await getStockCountWithItems(c.req.param("id"));
  if (!detail) return c.json({ error: "Not found" }, 404);
  if (!canAccessBranch(authUser, detail.count.branchId)) return c.json({ error: "Forbidden" }, 403);

  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.id, detail.count.branchId));
  const rmRows = await db.select({ id: rawMaterials.id, name: rawMaterials.name, sku: rawMaterials.sku }).from(rawMaterials);
  const rmById = new Map(rmRows.map((r) => [r.id, r]));
  const productRows = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products);
  const productById = new Map(productRows.map((p) => [p.id, p]));

  return c.json({
    count: { ...detail.count, branchName: branchRows[0]?.name },
    items: detail.items.map((i) => ({ ...i, meta: i.rawMaterialId ? rmById.get(i.rawMaterialId) : productById.get(i.productId!) })),
  });
});

const createInput = z.object({
  branchId: z.string().uuid(),
  itemType: z.enum(["raw_material", "product"]),
  notes: z.string().optional(),
});

stockCountsRoute.post(
  "/",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", createInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const count = await createStockCount({ branchId: input.branchId, itemType: input.itemType, startedBy: authUser.id, notes: input.notes });
      return c.json(count, 201);
    } catch (err) {
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

const completeInput = z.object({
  counts: z.array(z.object({ id: z.string().uuid(), countedQuantity: z.coerce.number().nonnegative() })),
});

stockCountsRoute.post(
  "/:id/complete",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", completeInput),
  async (c) => {
    const authUser = c.get("authUser");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    const existing = await getStockCountWithItems(id);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessBranch(authUser, existing.count.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const updated = await completeStockCount({ stockCountId: id, completedBy: authUser.id, counts: input.counts });
      return c.json(updated);
    } catch (err) {
      if (err instanceof InsufficientStockError) return c.json({ error: err.message }, 400);
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

stockCountsRoute.post("/:id/cancel", requireRole("owner", "admin", "commissary_staff", "branch_manager"), async (c) => {
  const authUser = c.get("authUser");
  const id = c.req.param("id");

  const existing = await getStockCountWithItems(id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (!canAccessBranch(authUser, existing.count.branchId)) return c.json({ error: "Forbidden" }, 403);

  try {
    const updated = await cancelStockCount({ stockCountId: id });
    return c.json(updated);
  } catch (err) {
    if (err instanceof Error) return c.json({ error: err.message }, 400);
    throw err;
  }
});
