import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, inventoryStockProducts, inventoryStockRawMaterials, products, rawMaterials } from "@/db/schema";

export async function getInventoryValueByBranch() {
  const branchRows = await db.select().from(branches).where(eq(branches.active, true));

  const rawMaterialStock = await db
    .select({
      branchId: inventoryStockRawMaterials.branchId,
      quantity: inventoryStockRawMaterials.quantity,
      costPerUnit: rawMaterials.costPerUnit,
    })
    .from(inventoryStockRawMaterials)
    .innerJoin(rawMaterials, eq(inventoryStockRawMaterials.rawMaterialId, rawMaterials.id));

  const productStock = await db
    .select({
      branchId: inventoryStockProducts.branchId,
      quantity: inventoryStockProducts.quantity,
      price: products.price,
    })
    .from(inventoryStockProducts)
    .innerJoin(products, eq(inventoryStockProducts.productId, products.id));

  return branchRows.map((branch) => {
    const rawMaterialValue = rawMaterialStock
      .filter((s) => s.branchId === branch.id)
      .reduce((sum, s) => sum + Number(s.quantity) * Number(s.costPerUnit), 0);
    const productValue = productStock
      .filter((s) => s.branchId === branch.id)
      .reduce((sum, s) => sum + Number(s.quantity) * Number(s.price), 0);

    return {
      branchId: branch.id,
      branchName: branch.name,
      rawMaterialValue,
      productValue,
      totalValue: rawMaterialValue + productValue,
    };
  });
}

export async function getLowStockAlerts(branchId: string | null) {
  const rows = await db
    .select({
      branchId: inventoryStockRawMaterials.branchId,
      quantity: inventoryStockRawMaterials.quantity,
      rawMaterialId: rawMaterials.id,
      name: rawMaterials.name,
      sku: rawMaterials.sku,
      reorderPoint: rawMaterials.reorderPoint,
    })
    .from(inventoryStockRawMaterials)
    .innerJoin(rawMaterials, eq(inventoryStockRawMaterials.rawMaterialId, rawMaterials.id))
    .where(branchId ? eq(inventoryStockRawMaterials.branchId, branchId) : undefined);

  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchById = new Map(branchRows.map((b) => [b.id, b.name]));

  return rows
    .filter((r) => Number(r.reorderPoint) > 0 && Number(r.quantity) <= Number(r.reorderPoint))
    .map((r) => ({ ...r, branchName: branchById.get(r.branchId) }));
}
