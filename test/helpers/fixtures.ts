import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  authUsers,
  branches,
  itemCategories,
  products,
  rawMaterials,
  recipeItems,
  recipes,
  roles,
  unitsOfMeasure,
  users,
} from "@/db/schema";

/**
 * These fixtures never delete what they create. stock_ledger_* rows are
 * append-only by DB trigger (forbid_mutation) and reference branches/items,
 * so any fixture touched by a stock movement can't be cleaned up afterward
 * anyway — fighting that would mean reimplementing the audit trail's own
 * guarantee. Instead every fixture gets a random unique name/sku so tests
 * never collide, and the local test DB is reset with `supabase db reset`
 * when the clutter matters. Never point this at a shared/production DB.
 */

export function uniqueSuffix() {
  return randomUUID().slice(0, 8);
}

async function getUnitId(abbreviation: string) {
  const [unit] = await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.abbreviation, abbreviation)).limit(1);
  if (!unit) throw new Error(`Seed unit not found: ${abbreviation} (did you run \`supabase db reset\`?)`);
  return unit.id;
}

async function getRoleId(key: string) {
  const [role] = await db.select().from(roles).where(eq(roles.key, key)).limit(1);
  if (!role) throw new Error(`Seed role not found: ${key} (did you run \`supabase db reset\`?)`);
  return role.id;
}

export async function createTestUser() {
  const id = randomUUID();
  const email = `test-${uniqueSuffix()}@example.test`;
  await db.insert(authUsers).values({ id });
  const roleId = await getRoleId("owner");
  await db.insert(users).values({ id, fullName: "Test User", email, roleId, branchId: null });
  return id;
}

export async function createTestBranch(type: "branch" | "commissary" = "branch") {
  const [branch] = await db
    .insert(branches)
    .values({ code: `TEST-${uniqueSuffix()}`, name: `Test Branch ${uniqueSuffix()}`, type })
    .returning();
  return branch;
}

export async function createTestRawMaterial(opts: { unitAbbrev?: string; costPerUnit?: number } = {}) {
  const unitId = await getUnitId(opts.unitAbbrev ?? "g");
  const [category] = await db
    .insert(itemCategories)
    .values({ name: `Test RM Category ${uniqueSuffix()}`, itemType: "raw_material" })
    .returning();
  const [rawMaterial] = await db
    .insert(rawMaterials)
    .values({
      sku: `TEST-RM-${uniqueSuffix()}`,
      name: `Test Raw Material ${uniqueSuffix()}`,
      categoryId: category.id,
      unitId,
      costPerUnit: String(opts.costPerUnit ?? 1),
    })
    .returning();
  return rawMaterial;
}

export async function createTestProduct(opts: { unitAbbrev?: string; price?: number } = {}) {
  const unitId = await getUnitId(opts.unitAbbrev ?? "pc");
  const [category] = await db
    .insert(itemCategories)
    .values({ name: `Test Product Category ${uniqueSuffix()}`, itemType: "product" })
    .returning();
  const [product] = await db
    .insert(products)
    .values({
      sku: `TEST-PROD-${uniqueSuffix()}`,
      name: `Test Product ${uniqueSuffix()}`,
      categoryId: category.id,
      unitId,
      price: String(opts.price ?? 100),
    })
    .returning();
  return product;
}

export async function createTestRecipe(params: {
  productId: string;
  yieldQuantity: number;
  yieldUnitAbbrev?: string;
  items: Array<{ rawMaterialId: string; quantity: number; unitAbbrev?: string }>;
}) {
  const yieldUnitId = await getUnitId(params.yieldUnitAbbrev ?? "pc");
  const [recipe] = await db
    .insert(recipes)
    .values({
      productId: params.productId,
      name: `Test Recipe ${uniqueSuffix()}`,
      yieldQuantity: String(params.yieldQuantity),
      yieldUnitId,
    })
    .returning();

  for (const item of params.items) {
    const unitId = await getUnitId(item.unitAbbrev ?? "g");
    await db.insert(recipeItems).values({
      recipeId: recipe.id,
      rawMaterialId: item.rawMaterialId,
      quantity: String(item.quantity),
      unitId,
    });
  }

  return recipe;
}
