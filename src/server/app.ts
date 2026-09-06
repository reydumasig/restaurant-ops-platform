import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "@/server/middleware/auth";
import { branchesRoute } from "@/server/routes/branches";
import { categoriesRoute } from "@/server/routes/categories";
import { unitsRoute } from "@/server/routes/units";
import { rawMaterialsRoute } from "@/server/routes/raw-materials";
import { productsRoute } from "@/server/routes/products";
import { rolesRoute } from "@/server/routes/roles";
import { usersRoute } from "@/server/routes/users";
import { inventoryRoute } from "@/server/routes/inventory";
import { transfersRoute } from "@/server/routes/transfers";
import { recipesRoute } from "@/server/routes/recipes";
import { productionRoute } from "@/server/routes/production";
import { posRoute } from "@/server/routes/pos";
import { dashboardRoute } from "@/server/routes/dashboard";
import { timekeepingRoute } from "@/server/routes/timekeeping";
import { suppliersRoute } from "@/server/routes/suppliers";
import { purchaseOrdersRoute } from "@/server/routes/purchase-orders";
import { wasteRoute } from "@/server/routes/waste";
import { stockCountsRoute } from "@/server/routes/stock-counts";
import { batchesRoute } from "@/server/routes/batches";

export const app = new Hono().basePath("/api");

app.get("/health", (c) => c.json({ status: "ok" }));

/**
 * All authenticated domain routers mount on `authed`, not `app` directly —
 * keeps unauthenticated endpoints (like /health) from ever picking up the
 * auth middleware by accident.
 */
export const authed = new Hono<{ Variables: AuthVariables }>();
authed.use("*", authMiddleware);

authed.get("/me", (c) => c.json(c.get("authUser")));

authed.route("/branches", branchesRoute);
authed.route("/categories", categoriesRoute);
authed.route("/units", unitsRoute);
authed.route("/raw-materials", rawMaterialsRoute);
authed.route("/products", productsRoute);
authed.route("/roles", rolesRoute);
authed.route("/users", usersRoute);
authed.route("/inventory", inventoryRoute);
authed.route("/transfers", transfersRoute);
authed.route("/recipes", recipesRoute);
authed.route("/production", productionRoute);
authed.route("/pos", posRoute);
authed.route("/dashboard", dashboardRoute);
authed.route("/timekeeping", timekeepingRoute);
authed.route("/suppliers", suppliersRoute);
authed.route("/purchase-orders", purchaseOrdersRoute);
authed.route("/waste-reports", wasteRoute);
authed.route("/stock-counts", stockCountsRoute);
authed.route("/batches", batchesRoute);

app.route("/", authed);

export type AppType = typeof app;
