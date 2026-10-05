import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { inventoryStockProducts, inventoryStockRawMaterials, productionRuns, stockLedgerRawMaterials } from "@/db/schema";
import { getBatchesForItem } from "@/server/lib/batches";
import { applyStockMovement, InsufficientStockError } from "@/server/lib/inventory";
import { runProduction } from "@/server/lib/production";
import { createTestBranch, createTestProduct, createTestRawMaterial, createTestRecipe, createTestUser } from "../helpers/fixtures";

describe("runProduction", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  async function rawMaterialStockOf(branchId: string, rawMaterialId: string) {
    const [row] = await db
      .select()
      .from(inventoryStockRawMaterials)
      .where(and(eq(inventoryStockRawMaterials.branchId, branchId), eq(inventoryStockRawMaterials.rawMaterialId, rawMaterialId)));
    return row ? Number(row.quantity) : 0;
  }

  async function productStockOf(branchId: string, productId: string) {
    const [row] = await db
      .select()
      .from(inventoryStockProducts)
      .where(and(eq(inventoryStockProducts.branchId, branchId), eq(inventoryStockProducts.productId, productId)));
    return row ? Number(row.quantity) : 0;
  }

  it("scales ingredient consumption and product yield by quantityProduced / recipe.yieldQuantity", async () => {
    const branch = await createTestBranch("commissary");
    const flour = await createTestRawMaterial({ costPerUnit: 2 });
    const sugar = await createTestRawMaterial({ costPerUnit: 3 });
    const product = await createTestProduct();

    // Recipe yields 10 units from 500g flour + 200g sugar.
    const recipe = await createTestRecipe({
      productId: product.id,
      yieldQuantity: 10,
      items: [
        { rawMaterialId: flour.id, quantity: 500 },
        { rawMaterialId: sugar.id, quantity: 200 },
      ],
    });

    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: flour.id, movementType: "stock_in", quantityDelta: 5000, performedBy });
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: sugar.id, movementType: "stock_in", quantityDelta: 5000, performedBy });

    // Producing 25 units is a 2.5x scale: expect 1250g flour and 500g sugar consumed.
    const run = await runProduction({ recipeId: recipe.id, branchId: branch.id, quantityProduced: 25, performedBy });

    const [runRow] = await db.select().from(productionRuns).where(eq(productionRuns.id, run.id));
    expect(Number(runRow.quantityProduced)).toBe(25);

    expect(await rawMaterialStockOf(branch.id, flour.id)).toBe(5000 - 1250);
    expect(await rawMaterialStockOf(branch.id, sugar.id)).toBe(5000 - 500);
    expect(await productStockOf(branch.id, product.id)).toBe(25);

    // Production consumption is FEFO-tracked automatically, with no
    // production-specific integration code — it goes through the same
    // applyStockMovement choke point as everything else.
    const [flourBatch] = await getBatchesForItem({ branchId: branch.id, rawMaterialId: flour.id });
    expect(Number(flourBatch.quantityRemaining)).toBe(5000 - 1250);
  });

  it("rolls back the entire run (no partial consumption, no yield, no run row) when one ingredient is short", async () => {
    const branch = await createTestBranch("commissary");
    const flour = await createTestRawMaterial();
    const scarceSpice = await createTestRawMaterial();
    const product = await createTestProduct();

    const recipe = await createTestRecipe({
      productId: product.id,
      yieldQuantity: 1,
      items: [
        { rawMaterialId: flour.id, quantity: 100 },
        { rawMaterialId: scarceSpice.id, quantity: 100 },
      ],
    });

    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: flour.id, movementType: "stock_in", quantityDelta: 1000, performedBy });
    // Only enough spice for half of one batch.
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: scarceSpice.id, movementType: "stock_in", quantityDelta: 50, performedBy });

    await expect(runProduction({ recipeId: recipe.id, branchId: branch.id, quantityProduced: 1, performedBy })).rejects.toThrow(InsufficientStockError);

    // Flour must be untouched — the transaction should have rolled back
    // entirely, not consumed flour before failing on the spice.
    expect(await rawMaterialStockOf(branch.id, flour.id)).toBe(1000);
    expect(await productStockOf(branch.id, product.id)).toBe(0);

    const runsForRecipe = await db.select().from(productionRuns).where(eq(productionRuns.recipeId, recipe.id));
    expect(runsForRecipe).toHaveLength(0);
  });

  it("supports a recipe that outputs a raw material instead of a product (e.g. marinating raw fish into a semi-finished component)", async () => {
    const branch = await createTestBranch("commissary");
    const rawFish = await createTestRawMaterial({ costPerUnit: 1 });
    const marinade = await createTestRawMaterial({ costPerUnit: 0.5 });
    const marinatedFish = await createTestRawMaterial({ costPerUnit: 0 });

    // Recipe yields 10 pc of marinated fish from 5000g raw fish + 500g marinade.
    const recipe = await createTestRecipe({
      outputRawMaterialId: marinatedFish.id,
      yieldQuantity: 10,
      items: [
        { rawMaterialId: rawFish.id, quantity: 5000 },
        { rawMaterialId: marinade.id, quantity: 500 },
      ],
    });

    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: rawFish.id, movementType: "stock_in", quantityDelta: 10000, performedBy });
    await applyStockMovement({ branchId: branch.id, itemType: "raw_material", itemId: marinade.id, movementType: "stock_in", quantityDelta: 1000, performedBy });

    const run = await runProduction({
      recipeId: recipe.id,
      branchId: branch.id,
      quantityProduced: 10,
      performedBy,
      batchExpiryDate: "2026-12-31",
    });

    expect(await rawMaterialStockOf(branch.id, rawFish.id)).toBe(10000 - 5000);
    expect(await rawMaterialStockOf(branch.id, marinade.id)).toBe(1000 - 500);
    expect(await rawMaterialStockOf(branch.id, marinatedFish.id)).toBe(10);

    const [ledgerRow] = await db
      .select()
      .from(stockLedgerRawMaterials)
      .where(
        and(
          eq(stockLedgerRawMaterials.branchId, branch.id),
          eq(stockLedgerRawMaterials.rawMaterialId, marinatedFish.id),
          eq(stockLedgerRawMaterials.movementType, "production_yield"),
        ),
      );
    expect(ledgerRow).toBeDefined();
    expect(Number(ledgerRow.quantityDelta)).toBe(10);
    expect(ledgerRow.referenceId).toBe(run.id);

    // The yield batch picked up the expiry date passed in, same as a stock-in would.
    const [batch] = await getBatchesForItem({ branchId: branch.id, rawMaterialId: marinatedFish.id });
    expect(batch.expiryDate).toBe("2026-12-31");
  });
});
