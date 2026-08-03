import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productionRuns, recipeItems, recipes } from "@/db/schema";
import { applyStockMovement } from "@/server/lib/inventory";

export async function runProduction(params: {
  recipeId: string;
  branchId: string;
  quantityProduced: number;
  performedBy: string;
  notes?: string;
}) {
  const { recipeId, branchId, quantityProduced, performedBy, notes } = params;

  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
  if (!recipe) throw new Error("Recipe not found");
  if (!recipe.active) throw new Error("Recipe is inactive");

  const items = await db.select().from(recipeItems).where(eq(recipeItems.recipeId, recipeId));
  if (items.length === 0) throw new Error("Recipe has no ingredients defined");

  const scale = quantityProduced / Number(recipe.yieldQuantity);

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(productionRuns)
      .values({
        recipeId,
        branchId,
        quantityProduced: String(quantityProduced),
        producedBy: performedBy,
        notes,
      })
      .returning();

    for (const item of items) {
      await applyStockMovement(
        {
          branchId,
          itemType: "raw_material",
          itemId: item.rawMaterialId,
          movementType: "production_consume",
          quantityDelta: -(Number(item.quantity) * scale),
          performedBy,
          referenceType: "production_run",
          referenceId: run.id,
        },
        tx,
      );
    }

    await applyStockMovement(
      {
        branchId,
        itemType: "product",
        itemId: recipe.productId,
        movementType: "production_yield",
        quantityDelta: quantityProduced,
        performedBy,
        referenceType: "production_run",
        referenceId: run.id,
      },
      tx,
    );

    return run;
  });
}

export async function listProductionRuns(branchId: string | null) {
  if (!branchId) {
    return db.select().from(productionRuns).orderBy(desc(productionRuns.producedAt));
  }
  return db.select().from(productionRuns).where(eq(productionRuns.branchId, branchId)).orderBy(desc(productionRuns.producedAt));
}
