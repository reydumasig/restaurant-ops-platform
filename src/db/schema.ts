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
  type AnyPgColumn,
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
    costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 4 }).notNull().default("0"),
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
  (table) => [
    uniqueIndex("inventory_stock_rm_branch_item_key").on(table.branchId, table.rawMaterialId),
    check("inventory_stock_rm_quantity_nonnegative", sql`${table.quantity} >= 0`),
  ],
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
  (table) => [
    uniqueIndex("inventory_stock_p_branch_item_key").on(table.branchId, table.productId),
    check("inventory_stock_p_quantity_nonnegative", sql`${table.quantity} >= 0`),
  ],
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
      sql`${table.movementType} in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_consume', 'sale_deduction', 'purchase_receipt', 'waste_writeoff')`,
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
      sql`${table.movementType} in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_yield', 'sale_deduction', 'waste_writeoff')`,
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
    shiftId: uuid("shift_id").references((): AnyPgColumn => posShifts.id),
  },
  (table) => [
    uniqueIndex("pos_sales_branch_reference_key").on(table.branchId, table.posReference),
    index("pos_sales_branch_date_idx").on(table.branchId, table.saleDate),
    index("pos_sales_shift_id_idx").on(table.shiftId),
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

// ============================================================
// POS Shift Management — a till/drawer control local to the internal POS
// module (itself a separate, separately-quoted add-on outside the Ops
// Platform's Phase 1-3 SOW). See the migration file for the design
// rationale and why this is distinct from CASA OS's cash management.
// ============================================================

export const posShifts = pgTable(
  "pos_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    status: text("status").notNull().default("open"),
    startingCash: numeric("starting_cash", { precision: 12, scale: 2 }).notNull(),
    openedBy: uuid("opened_by")
      .notNull()
      .references(() => users.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedBy: uuid("closed_by").references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    countedCash: numeric("counted_cash", { precision: 12, scale: 2 }),
    expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }),
    cashVariance: numeric("cash_variance", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pos_shifts_branch_id_idx").on(table.branchId, table.openedAt),
    uniqueIndex("pos_shifts_one_open_per_branch")
      .on(table.branchId)
      .where(sql`${table.status} = 'open'`),
    check("pos_shifts_status_check", sql`${table.status} in ('open', 'closed')`),
  ],
);

// ============================================================
// Time Keeping — minimal staff clock in/out (see migration
// 20260825140000_phase1_timekeeping.sql for the scope rationale).
// ============================================================

export const timePunches = pgTable(
  "time_punches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    type: text("type").notNull(),
    reason: text("reason"),
    // clock_timestamp(), not defaultNow() — see the migration for why.
    punchedAt: timestamp("punched_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("time_punches_user_id_idx").on(table.userId, table.punchedAt),
    index("time_punches_branch_id_idx").on(table.branchId, table.punchedAt),
    check("time_punches_type_check", sql`${table.type} in ('in', 'out')`),
    check("time_punches_reason_check", sql`${table.reason} in ('short_break', 'lunch', 'end_of_shift')`),
    check(
      "time_punches_reason_matches_type_check",
      sql`(${table.type} = 'out' and ${table.reason} is not null) or (${table.type} = 'in' and ${table.reason} is null)`,
    ),
  ],
);

// ============================================================
// Ops Phase 2, Milestone 1 — Suppliers, Purchase Orders, Goods Receiving,
// Supplier Price History (see CLAUDE.md Phase Gate Protocol for the
// authorization this was built under, and the migration file for design notes).
// ============================================================

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poNumber: text("po_number").notNull().unique(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    status: text("status").notNull().default("ordered"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    receivedBy: uuid("received_by").references(() => users.id),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("purchase_orders_supplier_id_idx").on(table.supplierId),
    index("purchase_orders_branch_id_idx").on(table.branchId),
    check("purchase_orders_status_check", sql`${table.status} in ('ordered', 'received', 'cancelled')`),
  ],
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id),
    rawMaterialId: uuid("raw_material_id")
      .notNull()
      .references(() => rawMaterials.id),
    quantityOrdered: numeric("quantity_ordered", { precision: 14, scale: 4 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).notNull(),
    quantityReceived: numeric("quantity_received", { precision: 14, scale: 4 }),
    actualUnitCost: numeric("actual_unit_cost", { precision: 12, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("purchase_order_items_po_id_idx").on(table.purchaseOrderId)],
);

export const supplierPriceHistory = pgTable(
  "supplier_price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    rawMaterialId: uuid("raw_material_id")
      .notNull()
      .references(() => rawMaterials.id),
    unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).notNull(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("supplier_price_history_rm_idx").on(table.rawMaterialId, table.recordedAt),
    index("supplier_price_history_supplier_idx").on(table.supplierId, table.recordedAt),
  ],
);

// ============================================================
// Ops Phase 2, Milestone 2 — Waste Management (reason codes + approval
// workflow). See the migration file for the design rationale.
// ============================================================

export const wasteReports = pgTable(
  "waste_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    itemType: text("item_type").notNull(),
    rawMaterialId: uuid("raw_material_id").references(() => rawMaterials.id),
    productId: uuid("product_id").references(() => products.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    reason: text("reason").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    reportedBy: uuid("reported_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("waste_reports_branch_id_idx").on(table.branchId, table.createdAt),
    index("waste_reports_status_idx").on(table.status),
    check("waste_reports_item_type_check", sql`${table.itemType} in ('raw_material', 'product')`),
    check("waste_reports_reason_check", sql`${table.reason} in ('spoilage', 'damage', 'expiry')`),
    check("waste_reports_status_check", sql`${table.status} in ('pending', 'approved', 'rejected')`),
    check(
      "waste_reports_item_ref_check",
      sql`(${table.itemType} = 'raw_material' and ${table.rawMaterialId} is not null and ${table.productId} is null) or (${table.itemType} = 'product' and ${table.productId} is not null and ${table.rawMaterialId} is null)`,
    ),
  ],
);

// ============================================================
// Ops Phase 2, Milestone 3 — Stock Count / Cycle Count. See the migration
// file for the design rationale.
// ============================================================

export const stockCounts = pgTable(
  "stock_counts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countNumber: text("count_number").notNull().unique(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    itemType: text("item_type").notNull(),
    status: text("status").notNull().default("in_progress"),
    startedBy: uuid("started_by")
      .notNull()
      .references(() => users.id),
    completedBy: uuid("completed_by").references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_counts_branch_id_idx").on(table.branchId),
    check("stock_counts_item_type_check", sql`${table.itemType} in ('raw_material', 'product')`),
    check("stock_counts_status_check", sql`${table.status} in ('in_progress', 'completed', 'cancelled')`),
  ],
);

export const stockCountItems = pgTable(
  "stock_count_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stockCountId: uuid("stock_count_id")
      .notNull()
      .references(() => stockCounts.id),
    rawMaterialId: uuid("raw_material_id").references(() => rawMaterials.id),
    productId: uuid("product_id").references(() => products.id),
    expectedQuantity: numeric("expected_quantity", { precision: 14, scale: 4 }).notNull(),
    countedQuantity: numeric("counted_quantity", { precision: 14, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_count_items_count_id_idx").on(table.stockCountId),
    check(
      "stock_count_items_item_ref_check",
      sql`(${table.rawMaterialId} is not null and ${table.productId} is null) or (${table.rawMaterialId} is null and ${table.productId} is not null)`,
    ),
  ],
);

// ============================================================
// Ops Phase 2, Milestone 4 — Batch and Expiration (FIFO/FEFO) Tracking,
// scoped to raw materials. See the migration file for design rationale.
// ============================================================

export const rawMaterialBatches = pgTable(
  "raw_material_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchNumber: text("batch_number").notNull().unique(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    rawMaterialId: uuid("raw_material_id")
      .notNull()
      .references(() => rawMaterials.id),
    receivedDate: date("received_date").notNull().defaultNow(),
    expiryDate: date("expiry_date"),
    quantityReceived: numeric("quantity_received", { precision: 14, scale: 4 }).notNull(),
    quantityRemaining: numeric("quantity_remaining", { precision: 14, scale: 4 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 4 }),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("raw_material_batches_fefo_idx").on(table.branchId, table.rawMaterialId, table.expiryDate, table.receivedDate),
    check(
      "raw_material_batches_source_type_check",
      sql`${table.sourceType} in ('stock_in', 'purchase_receipt', 'transfer_in', 'adjustment_increase', 'legacy_balance')`,
    ),
    check("raw_material_batches_remaining_check", sql`${table.quantityRemaining} >= 0 and ${table.quantityRemaining} <= ${table.quantityReceived}`),
  ],
);

export const rawMaterialBatchAllocations = pgTable(
  "raw_material_batch_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => rawMaterialBatches.id),
    stockLedgerId: uuid("stock_ledger_id")
      .notNull()
      .references(() => stockLedgerRawMaterials.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("raw_material_batch_allocations_batch_idx").on(table.batchId),
    index("raw_material_batch_allocations_ledger_idx").on(table.stockLedgerId),
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
