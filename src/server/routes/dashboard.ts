import { Hono } from "hono";
import { canAccessBranch, isHqScoped } from "@/server/lib/rbac";
import { getInventoryValueByBranch, getLowStockAlerts } from "@/server/lib/dashboard";
import { getSalesSummary } from "@/server/lib/pos";
import type { AuthVariables } from "@/server/middleware/auth";

export const dashboardRoute = new Hono<{ Variables: AuthVariables }>();

dashboardRoute.get("/summary", async (c) => {
  const authUser = c.get("authUser");
  const requestedBranchId = c.req.query("branchId") ?? null;
  const branchId = isHqScoped(authUser) ? requestedBranchId : authUser.branchId;

  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);

  const [inventoryByBranch, lowStockAlerts, salesToday] = await Promise.all([
    getInventoryValueByBranch(),
    getLowStockAlerts(branchId),
    getSalesSummary({ branchId, date }),
  ]);

  const scopedInventory = branchId ? inventoryByBranch.filter((b) => b.branchId === branchId) : inventoryByBranch;
  const totalInventoryValue = scopedInventory.reduce((sum, b) => sum + b.totalValue, 0);

  return c.json({
    inventoryByBranch: scopedInventory,
    totalInventoryValue,
    lowStockAlerts,
    salesToday,
  });
});
