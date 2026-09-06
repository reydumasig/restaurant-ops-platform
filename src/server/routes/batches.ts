import { Hono } from "hono";
import { db } from "@/db/client";
import { branches, rawMaterials } from "@/db/schema";
import { canAccessBranch, isHqScoped, type AuthUser } from "@/server/lib/rbac";
import { getAgingBatches, getExpiringBatches } from "@/server/lib/batches";
import type { AuthVariables } from "@/server/middleware/auth";

export const batchesRoute = new Hono<{ Variables: AuthVariables }>();

function resolveBranchId(authUser: AuthUser, requested: string | undefined) {
  if (isHqScoped(authUser)) return requested ?? null;
  return authUser.branchId;
}

async function enrichBatches<T extends { rawMaterialId: string; branchId: string }>(rows: T[]) {
  const rawMaterialRows = await db.select({ id: rawMaterials.id, name: rawMaterials.name, sku: rawMaterials.sku }).from(rawMaterials);
  const rawMaterialById = new Map(rawMaterialRows.map((r) => [r.id, r]));
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));

  return rows.map((r) => ({
    ...r,
    rawMaterialName: rawMaterialById.get(r.rawMaterialId)?.name,
    rawMaterialSku: rawMaterialById.get(r.rawMaterialId)?.sku,
    branchName: branchById.get(r.branchId),
  }));
}

batchesRoute.get("/expiring", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const withinDays = Number(c.req.query("withinDays") ?? 7);
  const rows = await getExpiringBatches({ branchId, withinDays });
  return c.json(await enrichBatches(rows));
});

batchesRoute.get("/aging", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const rows = await getAgingBatches({ branchId });
  return c.json(await enrichBatches(rows));
});
