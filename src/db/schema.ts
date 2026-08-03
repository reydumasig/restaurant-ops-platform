import {
  pgSchema,
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Supabase-managed schema; only declared here so our tables can reference it.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    address: text("address"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("branches_type_check", sql`${table.type} in ('commissary', 'branch')`)],
);

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  branchId: uuid("branch_id").references(() => branches.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unitsOfMeasure = pgTable("units_of_measure", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemCategories = pgTable(
  "item_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    itemType: text("item_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("item_categories_name_type_key").on(table.name, table.itemType),
    check("item_categories_item_type_check", sql`${table.itemType} in ('raw_material', 'product')`),
  ],
);

export const rawMaterials = pgTable(
  "raw_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => itemCategories.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unitsOfMeasure.id),
    costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 2 }).notNull().default("0"),
    reorderPoint: numeric("reorder_point", { precision: 14, scale: 4 }).notNull().default("0"),
    purchaseUnitLabel: text("purchase_unit_label"),
    purchaseUnitConversionFactor: numeric("purchase_unit_conversion_factor", { precision: 14, scale: 4 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("raw_materials_category_id_idx").on(table.categoryId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => itemCategories.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unitsOfMeasure.id),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("products_category_id_idx").on(table.categoryId)],
);

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    name: text("name").notNull(),
    yieldQuantity: numeric("yield_quantity", { precision: 14, scale: 4 }).notNull(),
    yieldUnitId: uuid("yield_unit_id")
      .notNull()
      .references(() => unitsOfMeasure.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("recipes_product_id_idx").on(table.productId)],
);

export const recipeItems = pgTable(
  "recipe_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    rawMaterialId: uuid("raw_material_id")
      .notNull()
      .references(() => rawMaterials.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unitsOfMeasure.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("recipe_items_recipe_id_raw_material_id_key").on(table.recipeId, table.rawMaterialId)],
);

export const inventoryStockRawMaterials = pgTable(
  "inventory_stock_raw_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    rawMaterialId: uuid("raw_material_id")
      .notNull()
      .references(() => rawMaterials.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("inventory_stock_rm_branch_item_key").on(table.branchId, table.rawMaterialId)],
);

export const inventoryStockProducts = pgTable(
  "inventory_stock_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("inventory_stock_p_branch_item_key").on(table.branchId, table.productId)],
);

export const stockLedgerRawMaterials = pgTable(
  "stock_ledger_raw_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    rawMaterialId: uuid("raw_material_id")
      .notNull()
      .references(() => rawMaterials.id),
    movementType: text("movement_type").notNull(),
    quantityDelta: numeric("quantity_delta", { precision: 14, scale: 4 }).notNull(),
    quantityAfter: numeric("quantity_after", { precision: 14, scale: 4 }).notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    performedBy: uuid("performed_by")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_ledger_rm_branch_item_idx").on(table.branchId, table.rawMaterialId, table.createdAt),
    check(
      "stock_ledger_rm_movement_type_check",
      sql`${table.movementType} in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_consume', 'sale_deduction')`,
    ),
  ],
);

export const stockLedgerProducts = pgTable(
  "stock_ledger_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    movementType: text("movement_type").notNull(),
    quantityDelta: numeric("quantity_delta", { precision: 14, scale: 4 }).notNull(),
    quantityAfter: numeric("quantity_after", { precision: 14, scale: 4 }).notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    performedBy: uuid("performed_by")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_ledger_p_branch_item_idx").on(table.branchId, table.productId, table.createdAt),
    check(
      "stock_ledger_p_movement_type_check",
      sql`${table.movementType} in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_yield', 'sale_deduction')`,
    ),
  ],
);

export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferNo: text("transfer_no").notNull().unique(),
    fromBranchId: uuid("from_branch_id")
      .notNull()
      .references(() => branches.id),
    toBranchId: uuid("to_branch_id")
      .notNull()
      .references(() => branches.id),
    status: text("status").notNull().default("pending"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    receivedBy: uuid("received_by").references(() => users.id),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (table) => [
    index("stock_transfers_from_branch_idx").on(table.fromBranchId),
    index("stock_transfers_to_branch_idx").on(table.toBranchId),
    check("stock_transfers_status_check", sql`${table.status} in ('pending', 'in_transit', 'received', 'cancelled')`),
    check("stock_transfers_branches_differ_check", sql`${table.fromBranchId} <> ${table.toBranchId}`),
  ],
);

export const stockTransferItemsRawMaterials = pgTable(
  "stock_transfer_items_raw_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    rawMaterialId: uuid("raw_material_id")
      .notNull()
      .references(() => rawMaterials.id),
    quantitySent: numeric("quantity_sent", { precision: 14, scale: 4 }).notNull(),
    quantityReceived: numeric("quantity_received", { precision: 14, scale: 4 }),
  },
  (table) => [uniqueIndex("stock_transfer_items_rm_transfer_item_key").on(table.transferId, table.rawMaterialId)],
);

export const stockTransferItemsProducts = pgTable(
  "stock_transfer_items_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantitySent: numeric("quantity_sent", { precision: 14, scale: 4 }).notNull(),
    quantityReceived: numeric("quantity_received", { precision: 14, scale: 4 }),
  },
  (table) => [uniqueIndex("stock_transfer_items_p_transfer_item_key").on(table.transferId, table.productId)],
);

export const productionRuns = pgTable(
  "production_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    quantityProduced: numeric("quantity_produced", { precision: 14, scale: 4 }).notNull(),
    producedBy: uuid("produced_by")
      .notNull()
      .references(() => users.id),
    producedAt: timestamp("produced_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("production_runs_branch_id_idx").on(table.branchId),
    index("production_runs_recipe_id_idx").on(table.recipeId),
  ],
);

export const posSales = pgTable(
  "pos_sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    posReference: text("pos_reference"),
    saleDate: date("sale_date").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    source: text("source").notNull().default("manual_import"),
    rawPayload: jsonb("raw_payload"),
    importedBy: uuid("imported_by")
      .notNull()
      .references(() => users.id),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
    discountType: text("discount_type").notNull().default("none"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    tenderedAmount: numeric("tendered_amount", { precision: 12, scale: 2 }),
    changeAmount: numeric("change_amount", { precision: 12, scale: 2 }),
  },
  (table) => [
    uniqueIndex("pos_sales_branch_reference_key").on(table.branchId, table.posReference),
    index("pos_sales_branch_date_idx").on(table.branchId, table.saleDate),
  ],
);

export const posSaleItems = pgTable(
  "pos_sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    posSaleId: uuid("pos_sale_id")
      .notNull()
      .references(() => posSales.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    index("pos_sale_items_sale_id_idx").on(table.posSaleId),
    index("pos_sale_items_product_id_idx").on(table.productId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_entity_idx").on(table.entityType, table.entityId)],
);
