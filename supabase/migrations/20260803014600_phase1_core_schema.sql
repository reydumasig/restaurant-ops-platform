-- Restaurant Operations Platform — Ops Phase 1 core schema
-- Scope: Master Data, Commissary/Branch Inventory, Stock Transfers,
-- Basic Production (Recipe/BOM), POS sales import, audit trail.
-- Do not add tables for Ops Phase 2+ or CASA OS here — see /CLAUDE.md.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only; % is not allowed', tg_table_name, tg_op;
end;
$$;

-- ============================================================
-- Master Data
-- ============================================================

create table roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
comment on table roles is 'Fixed role catalog; permission enforcement lives in application middleware keyed by roles.key.';

create table branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null check (type in ('commissary', 'branch')),
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger branches_set_updated_at before update on branches
  for each row execute function set_updated_at();

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role_id uuid not null references roles (id),
  branch_id uuid references branches (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_role_id_idx on users (role_id);
create index users_branch_id_idx on users (branch_id);
create trigger users_set_updated_at before update on users
  for each row execute function set_updated_at();
comment on column users.branch_id is 'Null for HQ-scoped roles (owner/admin) with all-branch access; required for branch/commissary-scoped roles — enforced in application logic, not a DB constraint.';

create table units_of_measure (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text not null unique,
  created_at timestamptz not null default now()
);

create table item_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  item_type text not null check (item_type in ('raw_material', 'product')),
  created_at timestamptz not null default now(),
  unique (name, item_type)
);

create table raw_materials (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid not null references item_categories (id),
  unit_id uuid not null references units_of_measure (id),
  cost_per_unit numeric(12, 2) not null default 0,
  reorder_point numeric(14, 4) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index raw_materials_category_id_idx on raw_materials (category_id);
create trigger raw_materials_set_updated_at before update on raw_materials
  for each row execute function set_updated_at();

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid not null references item_categories (id),
  unit_id uuid not null references units_of_measure (id),
  price numeric(12, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_id_idx on products (category_id);
create trigger products_set_updated_at before update on products
  for each row execute function set_updated_at();

-- ============================================================
-- Basic Production — Recipe / Bill of Materials
-- ============================================================

create table recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  name text not null,
  yield_quantity numeric(14, 4) not null,
  yield_unit_id uuid not null references units_of_measure (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_product_id_idx on recipes (product_id);
create trigger recipes_set_updated_at before update on recipes
  for each row execute function set_updated_at();

create table recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  raw_material_id uuid not null references raw_materials (id),
  quantity numeric(14, 4) not null,
  unit_id uuid not null references units_of_measure (id),
  created_at timestamptz not null default now(),
  unique (recipe_id, raw_material_id)
);
create index recipe_items_recipe_id_idx on recipe_items (recipe_id);

-- ============================================================
-- Inventory — current stock levels (per branch, per item type)
-- ============================================================

create table inventory_stock_raw_materials (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  raw_material_id uuid not null references raw_materials (id),
  quantity numeric(14, 4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, raw_material_id)
);
create trigger inventory_stock_raw_materials_set_updated_at before update on inventory_stock_raw_materials
  for each row execute function set_updated_at();

create table inventory_stock_products (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  product_id uuid not null references products (id),
  quantity numeric(14, 4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, product_id)
);
create trigger inventory_stock_products_set_updated_at before update on inventory_stock_products
  for each row execute function set_updated_at();

-- ============================================================
-- Stock ledger — append-only audit trail of every stock movement
-- ============================================================

create table stock_ledger_raw_materials (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  raw_material_id uuid not null references raw_materials (id),
  movement_type text not null check (movement_type in (
    'stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease',
    'transfer_out', 'transfer_in', 'production_consume'
  )),
  quantity_delta numeric(14, 4) not null,
  quantity_after numeric(14, 4) not null,
  reference_type text,
  reference_id uuid,
  performed_by uuid not null references users (id),
  notes text,
  created_at timestamptz not null default now()
);
create index stock_ledger_rm_branch_item_idx on stock_ledger_raw_materials (branch_id, raw_material_id, created_at);
create trigger stock_ledger_rm_forbid_update before update on stock_ledger_raw_materials
  for each row execute function forbid_mutation();
create trigger stock_ledger_rm_forbid_delete before delete on stock_ledger_raw_materials
  for each row execute function forbid_mutation();

create table stock_ledger_products (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  product_id uuid not null references products (id),
  movement_type text not null check (movement_type in (
    'stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease',
    'transfer_out', 'transfer_in', 'production_yield', 'sale_deduction'
  )),
  quantity_delta numeric(14, 4) not null,
  quantity_after numeric(14, 4) not null,
  reference_type text,
  reference_id uuid,
  performed_by uuid not null references users (id),
  notes text,
  created_at timestamptz not null default now()
);
create index stock_ledger_p_branch_item_idx on stock_ledger_products (branch_id, product_id, created_at);
create trigger stock_ledger_p_forbid_update before update on stock_ledger_products
  for each row execute function forbid_mutation();
create trigger stock_ledger_p_forbid_delete before delete on stock_ledger_products
  for each row execute function forbid_mutation();

-- ============================================================
-- Stock transfers — commissary <-> branch, branch <-> branch
-- ============================================================

create table stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_no text not null unique,
  from_branch_id uuid not null references branches (id),
  to_branch_id uuid not null references branches (id),
  status text not null default 'pending' check (status in ('pending', 'in_transit', 'received', 'cancelled')),
  created_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  received_by uuid references users (id),
  received_at timestamptz,
  notes text,
  check (from_branch_id <> to_branch_id)
);
create index stock_transfers_from_branch_idx on stock_transfers (from_branch_id);
create index stock_transfers_to_branch_idx on stock_transfers (to_branch_id);

create table stock_transfer_items_raw_materials (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references stock_transfers (id) on delete cascade,
  raw_material_id uuid not null references raw_materials (id),
  quantity_sent numeric(14, 4) not null,
  quantity_received numeric(14, 4),
  unique (transfer_id, raw_material_id)
);

create table stock_transfer_items_products (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references stock_transfers (id) on delete cascade,
  product_id uuid not null references products (id),
  quantity_sent numeric(14, 4) not null,
  quantity_received numeric(14, 4),
  unique (transfer_id, product_id)
);

-- ============================================================
-- Production runs
-- ============================================================

create table production_runs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id),
  branch_id uuid not null references branches (id),
  quantity_produced numeric(14, 4) not null,
  produced_by uuid not null references users (id),
  produced_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
create index production_runs_branch_id_idx on production_runs (branch_id);
create index production_runs_recipe_id_idx on production_runs (recipe_id);

-- ============================================================
-- POS integration — daily sales import
-- ============================================================

create table pos_sales (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  pos_reference text,
  sale_date date not null,
  total_amount numeric(12, 2) not null default 0,
  source text not null default 'manual_import',
  raw_payload jsonb,
  imported_by uuid not null references users (id),
  imported_at timestamptz not null default now(),
  unique (branch_id, pos_reference)
);
create index pos_sales_branch_date_idx on pos_sales (branch_id, sale_date);

create table pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  pos_sale_id uuid not null references pos_sales (id) on delete cascade,
  product_id uuid not null references products (id),
  quantity numeric(14, 4) not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null
);
create index pos_sale_items_sale_id_idx on pos_sale_items (pos_sale_id);
create index pos_sale_items_product_id_idx on pos_sale_items (product_id);

-- ============================================================
-- Audit log — non-stock actions (master data changes, role/user changes)
-- Stock-affecting actions are audited via the stock_ledger_* tables above.
-- ============================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);
create trigger audit_logs_forbid_update before update on audit_logs
  for each row execute function forbid_mutation();
create trigger audit_logs_forbid_delete before delete on audit_logs
  for each row execute function forbid_mutation();

-- ============================================================
-- Row Level Security — default deny. All application data access goes
-- through the Hono API layer (server-side, direct Postgres connection),
-- which enforces RBAC in middleware. RLS here is defense-in-depth against
-- any future direct client access via the Supabase anon/authenticated key.
-- ============================================================

alter table roles enable row level security;
alter table branches enable row level security;
alter table users enable row level security;
alter table units_of_measure enable row level security;
alter table item_categories enable row level security;
alter table raw_materials enable row level security;
alter table products enable row level security;
alter table recipes enable row level security;
alter table recipe_items enable row level security;
alter table inventory_stock_raw_materials enable row level security;
alter table inventory_stock_products enable row level security;
alter table stock_ledger_raw_materials enable row level security;
alter table stock_ledger_products enable row level security;
alter table stock_transfers enable row level security;
alter table stock_transfer_items_raw_materials enable row level security;
alter table stock_transfer_items_products enable row level security;
alter table production_runs enable row level security;
alter table pos_sales enable row level security;
alter table pos_sale_items enable row level security;
alter table audit_logs enable row level security;
