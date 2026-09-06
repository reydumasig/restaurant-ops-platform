import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, products, rawMaterials, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped, type AuthUser } from "@/server/lib/rbac";
import { InsufficientStockError } from "@/server/lib/inventory";
import { approveWasteReport, createWasteReport, getWasteReport, listWasteReports, rejectWasteReport } from "@/server/lib/waste";
import type { AuthVariables } from "@/server/middleware/auth";

export const wasteRoute = new Hono<{ Variables: AuthVariables }>();

function resolveBranchId(authUser: AuthUser, requested: string | undefined) {
  if (isHqScoped(authUser)) return requested ?? null;
  return authUser.branchId;
}

wasteRoute.get("/", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const status = c.req.query("status") as "pending" | "approved" | "rejected" | undefined;
  const rows = await listWasteReports({ branchId, status });

  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));
  const rmRows = await db.select({ id: rawMaterials.id, name: rawMaterials.name, sku: rawMaterials.sku }).from(rawMaterials);
  const rmById = new Map(rmRows.map((r) => [r.id, r]));
  const productRows = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products);
  const productById = new Map(productRows.map((p) => [p.id, p]));
  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  return c.json(
    rows.map((r) => ({
      ...r,
      branchName: branchById.get(r.branchId),
      itemMeta: r.itemType === "raw_material" ? rmById.get(r.rawMaterialId!) : productById.get(r.productId!),
      reportedByName: userById.get(r.reportedBy),
      reviewedByName: r.reviewedBy ? userById.get(r.reviewedBy) : null,
    })),
  );
});

const createInput = z.object({
  branchId: z.string().uuid(),
  itemType: z.enum(["raw_material", "product"]),
  itemId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  reason: z.enum(["spoilage", "damage", "expiry"]),
  notes: z.string().optional(),
});

wasteRoute.post(
  "/",
  requireRole("owner", "admin", "commissary_staff", "branch_manager", "branch_staff"),
  zValidator("json", createInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    const report = await createWasteReport({
      branchId: input.branchId,
      itemType: input.itemType,
      itemId: input.itemId,
      quantity: input.quantity,
      reason: input.reason,
      notes: input.notes,
      reportedBy: authUser.id,
    });

    return c.json(report, 201);
  },
);

const reviewInput = z.object({ reviewNotes: z.string().optional() });

wasteRoute.post(
  "/:id/approve",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", reviewInput),
  async (c) => {
    const authUser = c.get("authUser");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    const existing = await getWasteReport(id);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessBranch(authUser, existing.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const updated = await approveWasteReport({ wasteReportId: id, reviewedBy: authUser.id, reviewNotes: input.reviewNotes });
      return c.json(updated);
    } catch (err) {
      if (err instanceof InsufficientStockError) return c.json({ error: err.message }, 400);
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

wasteRoute.post(
  "/:id/reject",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", reviewInput),
  async (c) => {
    const authUser = c.get("authUser");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    const existing = await getWasteReport(id);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessBranch(authUser, existing.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const updated = await rejectWasteReport({ wasteReportId: id, reviewedBy: authUser.id, reviewNotes: input.reviewNotes });
      return c.json(updated);
    } catch (err) {
      if (err instanceof Error) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);
