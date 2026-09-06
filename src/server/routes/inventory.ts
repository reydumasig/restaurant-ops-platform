import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  branches,
  inventoryStockProducts,
  inventoryStockRawMaterials,
  itemCategories,
  products,
  rawMaterials,
  unitsOfMeasure,
  users,
} from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { canAccessBranch, isHqScoped, type AuthUser } from "@/server/lib/rbac";
import { applyStockMovement, getLedger, getStockLevels, InsufficientStockError } from "@/server/lib/inventory";
import type { AuthVariables } from "@/server/middleware/auth";

export const inventoryRoute = new Hono<{ Variables: AuthVariables }>();

function resolveBranchId(authUser: AuthUser, requested: string | undefined) {
  if (isHqScoped(authUser)) {
    return requested ?? null;
  }
  return authUser.branchId;
}

inventoryRoute.get("/stock", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (!branchId) return c.json({ error: "branchId is required" }, 400);
  if (!canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const { rawMaterialStock, productStock } = await getStockLevels(branchId);

  const rawMaterialRows = await db
    .select({
      id: rawMaterials.id,
      name: rawMaterials.name,
      sku: rawMaterials.sku,
      unitAbbreviation: unitsOfMeasure.abbreviation,
      categoryName: itemCategories.name,
      reorderPoint: rawMaterials.reorderPoint,
    })
    .from(rawMaterials)
    .innerJoin(unitsOfMeasure, eq(rawMaterials.unitId, unitsOfMeasure.id))
    .innerJoin(itemCategories, eq(rawMaterials.categoryId, itemCategories.id));

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unitAbbreviation: unitsOfMeasure.abbreviation,
      categoryName: itemCategories.name,
    })
    .from(products)
    .innerJoin(unitsOfMeasure, eq(products.unitId, unitsOfMeasure.id))
    .innerJoin(itemCategories, eq(products.categoryId, itemCategories.id));

  const rawMaterialById = new Map(rawMaterialRows.map((r) => [r.id, r]));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  return c.json({
    rawMaterials: rawMaterialStock.map((s) => ({ ...s, meta: rawMaterialById.get(s.rawMaterialId) })),
    products: productStock.map((s) => ({ ...s, meta: productById.get(s.productId) })),
  });
});

inventoryRoute.get("/report", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);

  const branchRows = await db.select().from(branches).where(branchId ? eq(branches.id, branchId) : undefined);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));

  const rawMaterialStock = await db
    .select({
      branchId: inventoryStockRawMaterials.branchId,
      quantity: inventoryStockRawMaterials.quantity,
      name: rawMaterials.name,
      sku: rawMaterials.sku,
      categoryName: itemCategories.name,
      unitAbbreviation: unitsOfMeasure.abbreviation,
      costPerUnit: rawMaterials.costPerUnit,
    })
    .from(inventoryStockRawMaterials)
    .innerJoin(rawMaterials, eq(inventoryStockRawMaterials.rawMaterialId, rawMaterials.id))
    .innerJoin(itemCategories, eq(rawMaterials.categoryId, itemCategories.id))
    .innerJoin(unitsOfMeasure, eq(rawMaterials.unitId, unitsOfMeasure.id))
    .where(branchId ? eq(inventoryStockRawMaterials.branchId, branchId) : undefined);

  const productStock = await db
    .select({
      branchId: inventoryStockProducts.branchId,
      quantity: inventoryStockProducts.quantity,
      name: products.name,
      sku: products.sku,
      categoryName: itemCategories.name,
      unitAbbreviation: unitsOfMeasure.abbreviation,
      costPerUnit: products.price,
    })
    .from(inventoryStockProducts)
    .innerJoin(products, eq(inventoryStockProducts.productId, products.id))
    .innerJoin(itemCategories, eq(products.categoryId, itemCategories.id))
    .innerJoin(unitsOfMeasure, eq(products.unitId, unitsOfMeasure.id))
    .where(branchId ? eq(inventoryStockProducts.branchId, branchId) : undefined);

  const rows = [
    ...rawMaterialStock.map((r) => ({ ...r, itemType: "raw_material" as const, branchName: branchById.get(r.branchId) })),
    ...productStock.map((r) => ({ ...r, itemType: "product" as const, branchName: branchById.get(r.branchId) })),
  ];

  return c.json(rows);
});

inventoryRoute.get("/ledger", async (c) => {
  const authUser = c.get("authUser");
  const branchId = resolveBranchId(authUser, c.req.query("branchId"));
  if (branchId && !canAccessBranch(authUser, branchId)) return c.json({ error: "Forbidden" }, 403);
  if (!branchId && !isHqScoped(authUser)) return c.json({ error: "branchId is required" }, 400);

  const userRows = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u.fullName]));

  if (c.req.query("itemType") === "product") {
    const rows = await getLedger({ branchId: branchId ?? undefined, itemType: "product", limit: 200 });
    const nameRows = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products);
    const nameById = new Map(nameRows.map((p) => [p.id, p]));
    return c.json(
      rows.map((r) => ({
        ...r,
        itemName: nameById.get(r.productId)?.name,
        itemSku: nameById.get(r.productId)?.sku,
        performedByName: userById.get(r.performedBy),
      })),
    );
  }

  const rows = await getLedger({ branchId: branchId ?? undefined, itemType: "raw_material", limit: 200 });
  const nameRows = await db.select({ id: rawMaterials.id, name: rawMaterials.name, sku: rawMaterials.sku }).from(rawMaterials);
  const nameById = new Map(nameRows.map((r) => [r.id, r]));
  return c.json(
    rows.map((r) => ({
      ...r,
      itemName: nameById.get(r.rawMaterialId)?.name,
      itemSku: nameById.get(r.rawMaterialId)?.sku,
      performedByName: userById.get(r.performedBy),
    })),
  );
});

const movementInput = z.object({
  branchId: z.string().uuid(),
  itemType: z.enum(["raw_material", "product"]),
  itemId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  notes: z.string().optional(),
  expiryDate: z.string().optional(),
});

inventoryRoute.post(
  "/stock-in",
  requireRole("owner", "admin", "commissary_staff", "branch_manager", "branch_staff"),
  zValidator("json", movementInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    const ledgerRow = await applyStockMovement({
      branchId: input.branchId,
      itemType: input.itemType,
      itemId: input.itemId,
      movementType: "stock_in",
      quantityDelta: input.quantity,
      performedBy: authUser.id,
      referenceType: "manual_stock_in",
      notes: input.notes,
      batchExpiryDate: input.itemType === "raw_material" ? (input.expiryDate ?? null) : undefined,
    });

    return c.json(ledgerRow, 201);
  },
);

inventoryRoute.post(
  "/stock-out",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", movementInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    try {
      const ledgerRow = await applyStockMovement({
        branchId: input.branchId,
        itemType: input.itemType,
        itemId: input.itemId,
        movementType: "stock_out",
        quantityDelta: -input.quantity,
        performedBy: authUser.id,
        referenceType: "manual_stock_out",
        notes: input.notes,
      });
      return c.json(ledgerRow, 201);
    } catch (err) {
      if (err instanceof InsufficientStockError) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

const adjustmentInput = z.object({
  branchId: z.string().uuid(),
  itemType: z.enum(["raw_material", "product"]),
  itemId: z.string().uuid(),
  correctedQuantity: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

inventoryRoute.post(
  "/adjustment",
  requireRole("owner", "admin", "commissary_staff", "branch_manager"),
  zValidator("json", adjustmentInput),
  async (c) => {
    const authUser = c.get("authUser");
    const input = c.req.valid("json");
    if (!canAccessBranch(authUser, input.branchId)) return c.json({ error: "Forbidden" }, 403);

    const { rawMaterialStock, productStock } = await getStockLevels(input.branchId);
    const currentQty =
      input.itemType === "raw_material"
        ? Number(rawMaterialStock.find((s) => s.rawMaterialId === input.itemId)?.quantity ?? 0)
        : Number(productStock.find((s) => s.productId === input.itemId)?.quantity ?? 0);

    const delta = input.correctedQuantity - currentQty;
    if (delta === 0) return c.json({ error: "Corrected quantity matches current stock — nothing to adjust" }, 400);

    const ledgerRow = await applyStockMovement({
      branchId: input.branchId,
      itemType: input.itemType,
      itemId: input.itemId,
      movementType: delta > 0 ? "adjustment_increase" : "adjustment_decrease",
      quantityDelta: delta,
      performedBy: authUser.id,
      referenceType: "manual_adjustment",
      notes: input.notes,
    });

    return c.json(ledgerRow, 201);
  },
);

inventoryRoute.get("/branches-for-user", async (c) => {
  const authUser = c.get("authUser");
  if (isHqScoped(authUser)) {
    const rows = await db.select().from(branches).where(eq(branches.active, true)).orderBy(branches.name);
    return c.json(rows);
  }
  if (!authUser.branchId) return c.json([]);
  const rows = await db.select().from(branches).where(eq(branches.id, authUser.branchId));
  return c.json(rows);
});
