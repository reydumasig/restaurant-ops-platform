import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, products, rawMaterials, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped } from "@/server/lib/rbac";
import { InsufficientStockError } from "@/server/lib/inventory";
import { cancelTransfer, confirmReceipt, createTransfer, getTransferWithItems, listTransfers } from "@/server/lib/transfers";
import type { AuthVariables } from "@/server/middleware/auth";

export const transfersRoute = new Hono<{ Variables: AuthVariables }>();

async function enrichTransfers<T extends { fromBranchId: string; toBranchId: string; createdBy: string; receivedBy: string | null }>(
  rows: T[],
) {
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));
  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  return rows.map((r) => ({
    ...r,
    fromBranchName: branchById.get(r.fromBranchId),
    toBranchName: branchById.get(r.toBranchId),
    createdByName: userById.get(r.createdBy),
    receivedByName: r.receivedBy ? userById.get(r.receivedBy) : null,
  }));
}

transfersRoute.get("/", async (c) => {
  const authUser = c.get("authUser");
  const branchId = isHqScoped(authUser) ? null : authUser.branchId;
  const rows = await listTransfers(branchId);
  return c.json(await enrichTransfers(rows));
});

transfersRoute.get("/:id", async (c) => {
  const authUser = c.get("authUser");
  const result = await getTransferWithItems(c.req.param("id"));
  if (!result) return c.json({ error: "Not found" }, 404);

  if (!canAccessBranch(authUser, result.transfer.fromBranchId) && !canAccessBranch(authUser, result.transfer.toBranchId)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const rawMaterialRows = await db.select({ id: rawMaterials.id, name: rawMaterials.name, sku: rawMaterials.sku }).from(rawMaterials);
  const rawMaterialById = new Map(rawMaterialRows.map((r) => [r.id, r]));
  const productRows = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products);
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const [enriched] = await enrichTransfers([result.transfer]);

  return c.json({
    transfer: enriched,
    rawMaterialItems: result.rawMaterialItems.map((i) => ({ ...i, meta: rawMaterialById.get(i.rawMaterialId) })),
    productItems: result.productItems.map((i) => ({ ...i, meta: productById.get(i.productId) })),
  });
});

const lineInput = z.object({
  itemType: z.enum(["raw_material", "product"]),
  itemId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
});

const createInput = z.object({
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  items: z.array(lineInput).min(1),
  notes: z.string().optional(),
});

transfersRoute.post(
  "/",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", createInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");

    if (input.fromBranchId === input.toBranchId) return c.json({ error: "Source and destination branch must differ" }, 400);
    if (!canAccessBranch(authUser, input.fromBranchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const transfer = await createTransfer({
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        createdBy: authUser.id,
        items: input.items,
        notes: input.notes,
      });
      return c.json(transfer, 201);
    } catch (err) {
      if (err instanceof InsufficientStockError) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

const receiveInput = z.object({
  rawMaterialReceipts: z.array(z.object({ id: z.string().uuid(), quantityReceived: z.coerce.number().nonnegative() })),
  productReceipts: z.array(z.object({ id: z.string().uuid(), quantityReceived: z.coerce.number().nonnegative() })),
});

transfersRoute.post(
  "/:id/receive",
  requireRole("owner", "admin", "commissary_staff", "branch_manager", "branch_staff"),
  zValidator("json", receiveInput),
  async (c) => {
    const authUser = c.get("authUser");
    const transferId = c.req.param("id");
    const input = c.req.valid("json");

    const existing = await getTransferWithItems(transferId);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessBranch(authUser, existing.transfer.toBranchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const updated = await confirmReceipt({
        transferId,
        receivedBy: authUser.id,
        rawMaterialReceipts: input.rawMaterialReceipts,
        productReceipts: input.productReceipts,
      });
      return c.json(updated);
    } catch (err) {
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

transfersRoute.post("/:id/cancel", requireRole("owner", "admin", "commissary_staff", "branch_manager"), async (c) => {
  const authUser = c.get("authUser");
  const transferId = c.req.param("id");

  const existing = await getTransferWithItems(transferId);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (!canAccessBranch(authUser, existing.transfer.fromBranchId)) return c.json({ error: "Forbidden" }, 403);

  try {
    const updated = await cancelTransfer({ transferId, cancelledBy: authUser.id });
    return c.json(updated);
  } catch (err) {
    if (err instanceof Error) return c.json({ error: err.message }, 400);
    throw err;
  }
});
