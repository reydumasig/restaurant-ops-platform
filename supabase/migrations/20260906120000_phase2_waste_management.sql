-- Ops Phase 2, Milestone 2: Waste Management with reason codes and an
-- approval workflow. See CLAUDE.md's Phase Gate Protocol for authorization.
--
-- Design: a waste report is submitted by anyone (branch_staff included —
-- they're the ones who actually notice spoiled/damaged stock) as 'pending'
-- and has NO stock effect yet. A manager-tier role then approves (which
-- deducts stock through the existing applyStockMovement() choke point,
-- under a new 'waste_writeoff' movement type) or rejects it (no stock
-- effect, stays as an audit record). This is the actual control the SOW's
-- "approval workflow" describes — not just a reason-code label on a
-- regular stock-out.

alter table stock_ledger_raw_materials
  drop constraint stock_ledger_rm_movement_type_check;
alter table stock_ledger_raw_materials
  add constraint stock_ledger_rm_movement_type_check
  check (movement_type in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_consume', 'sale_deduction', 'purchase_receipt', 'waste_writeoff'));

-- The original core-schema migration declared this check inline with no
-- explicit name, so Postgres auto-generated "stock_ledger_products_movement_type_check"
-- (using the full table name) — not the abbreviated "stock_ledger_p_..." that
-- schema.ts assumes. Renaming it here to match schema.ts's convention (and
-- the raw_materials table's constraint, which was already renamed this way).
alter table stock_ledger_products
  drop constraint stock_ledger_products_movement_type_check;
alter table stock_ledger_products
  add constraint stock_ledger_p_movement_type_check
  check (movement_type in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_yield', 'sale_deduction', 'waste_writeoff'));

create table waste_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  item_type text not null check (item_type in ('raw_material', 'product')),
  raw_material_id uuid references raw_materials (id),
  product_id uuid references products (id),
  quantity numeric(14, 4) not null check (quantity > 0),
  reason text not null check (reason in ('spoilage', 'damage', 'expiry')),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reported_by uuid not null references users (id),
  reviewed_by uuid references users (id),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (item_type = 'raw_material' and raw_material_id is not null and product_id is null) or
    (item_type = 'product' and product_id is not null and raw_material_id is null)
  )
);
create index waste_reports_branch_id_idx on waste_reports (branch_id, created_at);
create index waste_reports_status_idx on waste_reports (status);

alter table waste_reports enable row level security;
