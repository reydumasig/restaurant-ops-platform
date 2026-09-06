import { Hono } from "hono";
import { isHqScoped } from "@/server/lib/rbac";
import { getBranchPerformance, getBranchProfitability, getFoodCostAnalysis, getProductProfitability } from "@/server/lib/analytics";
import type { AuthVariables } from "@/server/middleware/auth";

export const analyticsRoute = new Hono<{ Variables: AuthVariables }>();

function dateRange(c: { req: { query: (key: string) => string | undefined } }) {
  const to = c.req.query("to") ?? new Date().toISOString().slice(0, 10);
  const from = c.req.query("from") ?? (() => {
    const d = new Date(`${to}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  return { from, to };
}

analyticsRoute.get("/food-cost", async (c) => {
  const rows = await getFoodCostAnalysis();
  return c.json(rows);
});

analyticsRoute.get("/branch-performance", async (c) => {
  const authUser = c.get("authUser");
  if (!isHqScoped(authUser)) return c.json({ error: "Forbidden" }, 403);

  const { from, to } = dateRange(c);
  const rows = await getBranchPerformance({ from, to });
  return c.json(rows);
});

analyticsRoute.get("/profitability/products", async (c) => {
  const { from, to } = dateRange(c);
  const rows = await getProductProfitability({ from, to });
  return c.json(rows);
});

analyticsRoute.get("/profitability/branches", async (c) => {
  const authUser = c.get("authUser");
  if (!isHqScoped(authUser)) return c.json({ error: "Forbidden" }, 403);

  const { from, to } = dateRange(c);
  const rows = await getBranchProfitability({ from, to });
  return c.json(rows);
});
