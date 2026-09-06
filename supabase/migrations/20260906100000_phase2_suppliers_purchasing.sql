-- Ops Phase 2, Milestone 1: Suppliers, Purchase Orders, Goods Receiving,
-- and Supplier Price History. See CLAUDE.md's Phase Gate Protocol table for
-- the authorization this was built under.
--
-- Design notes:
-- * A PO is a single-shot receive, same simplicity as stock_transfers (no
--   multi-session partial receiving state machine) — one receiving action
--   closes the PO, discrepancies (quantity or price) are recorded, not
--   blocked.
-- * supplier_price_history is append-only (same audit philosophy as the
--   stock ledger) and is the source of truth for "did the price go up or
--   down" and "did we pay above the going rate" — both driven off real
--   receiving events, not manual entry.
-- * Receiving a PO writes to stock_ledger_raw_materials via the existing
--   applyStockMovement() choke point, under a new 'purchase_receipt'
--   movement type — reusing the Phase 1 inventory engine rather than a
--   parallel one.

alter table stock_ledger_raw_materials
  drop constraint stock_ledger_rm_movement_type_check;
alter table stock_ledger_raw_materials
  add constraint stock_ledger_rm_movement_type_check
  check (movement_type in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_consume', 'sale_deduction', 'purchase_receipt'));

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger suppliers_set_updated_at before update on suppliers
  for each row execute function set_updated_at();

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references suppliers (id),
  branch_id uuid not null references branches (id),
  status text not null default 'ordered' check (status in ('ordered', 'received', 'cancelled')),
  created_by uuid not null references users (id),
  received_by uuid references users (id),
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_orders_supplier_id_idx on purchase_orders (supplier_id);
create index purchase_orders_branch_id_idx on purchase_orders (branch_id);
create trigger purchase_orders_set_updated_at before update on purchase_orders
  for each row execute function set_updated_at();

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id),
  raw_material_id uuid not null references raw_materials (id),
  quantity_ordered numeric(14, 4) not null check (quantity_ordered > 0),
  unit_cost numeric(12, 4) not null check (unit_cost >= 0),
  quantity_received numeric(14, 4),
  actual_unit_cost numeric(12, 4),
  created_at timestamptz not null default now()
);
create index purchase_order_items_po_id_idx on purchase_order_items (purchase_order_id);

-- Append-only, same as the stock ledger tables.
create table supplier_price_history (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id),
  raw_material_id uuid not null references raw_materials (id),
  unit_cost numeric(12, 4) not null,
  purchase_order_id uuid not null references purchase_orders (id),
  recorded_at timestamptz not null default now()
);
create index supplier_price_history_rm_idx on supplier_price_history (raw_material_id, recorded_at);
create index supplier_price_history_supplier_idx on supplier_price_history (supplier_id, recorded_at);
create trigger supplier_price_history_forbid_update before update on supplier_price_history
  for each row execute function forbid_mutation();
create trigger supplier_price_history_forbid_delete before delete on supplier_price_history
  for each row execute function forbid_mutation();

alter table suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table supplier_price_history enable row level security;
