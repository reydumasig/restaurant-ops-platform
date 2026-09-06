import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, rawMaterials, suppliers, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped, type AuthUser } from "@/server/lib/rbac";
import type { AuthVariables } from "@/server/middleware/auth";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderWithItems,
  listPurchaseOrders,
  receivePurchaseOrder,
} from "@/server/lib/purchasing";

export const purchaseOrdersRoute = new Hono<{ Variables: AuthVariables }>();

function resolveBranchId(authUser: AuthUser, requested: string | undefined) {
  if (isHqScoped(authUser)) return requested ?? null;
  return authUser.branchId;
}

purchaseOrdersRoute.get("/", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const rows = await listPurchaseOrders(branchId);

  const supplierRows = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
  const supplierById = new Map(supplierRows.map((s) => [s.id, s.name]));
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));
  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  return c.json(
    rows.map((r) => ({
      ...r,
      supplierName: supplierById.get(r.supplierId),
      branchName: branchById.get(r.branchId),
      createdByName: userById.get(r.createdBy),
    })),
  );
});

purchaseOrdersRoute.get("/:id", async (c) => {
  const authUser = c.get("authUser");
  const detail = await getPurchaseOrderWithItems(c.req.param("id"));
  if (!detail) return c.json({ error: "Not found" }, 404);
  if (!canAccessBranch(authUser, detail.po.branchId)) return c.json({ error: "Forbidden" }, 403);

  const supplierRows = await db.select().from(suppliers).where(eq(suppliers.id, detail.po.supplierId));
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.id, detail.po.branchId));
  const rmRows = await db.select({ id: rawMaterials.id, name: rawMaterials.name, sku: rawMaterials.sku }).from(rawMaterials);
  const rmById = new Map(rmRows.map((r) => [r.id, r]));

  return c.json({
    po: { ...detail.po, supplierName: supplierRows[0]?.name, branchName: branchRows[0]?.name },
    items: detail.items.map((i) => ({ ...i, meta: rmById.get(i.rawMaterialId) })),
  });
});

const poLineInput = z.object({
  rawMaterialId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
});

const createPoInput = z.object({
  supplierId: z.string().uuid(),
  branchId: z.string().uuid(),
  items: z.array(poLineInput).min(1),
  notes: z.string().optional(),
});

purchaseOrdersRoute.post(
  "/",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", createPoInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    const po = await createPurchaseOrder({
      supplierId: input.supplierId,
      branchId: input.branchId,
      createdBy: authUser.id,
      items: input.items,
      notes: input.notes,
    });

    return c.json(po, 201);
  },
);

const receiveInput = z.object({
  receipts: z.array(
    z.object({
      id: z.string().uuid(),
      quantityReceived: z.coerce.number().nonnegative(),
      actualUnitCost: z.coerce.number().nonnegative().optional(),
      expiryDate: z.string().optional(),
    }),
  ),
});

purchaseOrdersRoute.post(
  "/:id/receive",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", receiveInput),
  async (c) => {
    const authUser = c.get("authUser");
    const purchaseOrderId = c.req.param("id");
    const input = c.req.valid("json");

    const existing = await getPurchaseOrderWithItems(purchaseOrderId);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessBranch(authUser, existing.po.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const result = await receivePurchaseOrder({ purchaseOrderId, receivedBy: authUser.id, receipts: input.receipts });
      return c.json(result);
    } catch (err) {
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

purchaseOrdersRoute.post(
  "/:id/cancel",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  async (c) => {
    const authUser = c.get("authUser");
    const purchaseOrderId = c.req.param("id");

    const existing = await getPurchaseOrderWithItems(purchaseOrderId);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessBranch(authUser, existing.po.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const updated = await cancelPurchaseOrder({ purchaseOrderId, cancelledBy: authUser.id });
      return c.json(updated);
    } catch (err) {
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);
