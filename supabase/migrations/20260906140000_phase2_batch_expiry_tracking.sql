-- Ops Phase 2, Milestone 4: Batch and Expiration (FIFO/FEFO) Tracking.
-- Scoped to raw materials — Casa Inasal's perishables and supplier
-- receipts are what carry real expiry dates. Finished goods (products)
-- are cooked-to-order same-day in Phase 1 and were never batch-tracked;
-- extending batching to them isn't part of this milestone.
--
-- Design:
-- * raw_material_batches is a mutable "remaining balance per lot" table
--   (quantity_remaining decrements as the lot is consumed), same category
--   as inventory_stock_raw_materials itself — not append-only.
-- * raw_material_batch_allocations is the append-only ledger tying each
--   stock_ledger_raw_materials row to the batch(es) it actually drew from.
--   This is what lets a stock transfer's receiving side preserve the
--   exact expiry date(s) of the batch(es) that were shipped, instead of
--   minting a fresh no-expiry batch at the destination branch — without
--   this, every branch (which receives ~all its raw material stock via
--   transfers from the commissary, not direct purchases) would lose
--   FEFO/expiry visibility entirely.
-- * Consumption is First-Expired-First-Out (batches with a known expiry
--   date, soonest first), falling back to First-In-First-Out for batches
--   with no known expiry (oldest received_date first). This lives inside
--   applyStockMovement() itself (the existing Phase 1 choke point every
--   stock-affecting feature already goes through), so every raw material
--   decrease — sale deduction, production consumption, transfers, waste,
--   manual stock-out, adjustments, stock counts — is automatically
--   FEFO-aware with no per-feature integration work.
-- * Existing stock predates batch tracking. Every (branch, raw_material)
--   that already has stock on hand gets one 'legacy_balance' batch with
--   no known expiry, sized to its current quantity, so FEFO consumption
--   always has something to draw from and no existing stock silently
--   becomes unconsumable.

create table raw_material_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,
  branch_id uuid not null references branches (id),
  raw_material_id uuid not null references raw_materials (id),
  received_date date not null default current_date,
  expiry_date date,
  quantity_received numeric(14, 4) not null check (quantity_received > 0),
  quantity_remaining numeric(14, 4) not null check (quantity_remaining >= 0),
  unit_cost numeric(12, 4),
  source_type text not null check (source_type in ('stock_in', 'purchase_receipt', 'transfer_in', 'adjustment_increase', 'legacy_balance')),
  source_id uuid,
  created_at timestamptz not null default now(),
  check (quantity_remaining <= quantity_received)
);
create index raw_material_batches_fefo_idx on raw_material_batches (branch_id, raw_material_id, expiry_date, received_date);

-- Append-only, same audit philosophy as the stock ledger tables.
create table raw_material_batch_allocations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references raw_material_batches (id),
  stock_ledger_id uuid not null references stock_ledger_raw_materials (id),
  quantity numeric(14, 4) not null check (quantity > 0),
  created_at timestamptz not null default now()
);
create index raw_material_batch_allocations_batch_idx on raw_material_batch_allocations (batch_id);
create index raw_material_batch_allocations_ledger_idx on raw_material_batch_allocations (stock_ledger_id);
create trigger raw_material_batch_allocations_forbid_update before update on raw_material_batch_allocations
  for each row execute function forbid_mutation();
create trigger raw_material_batch_allocations_forbid_delete before delete on raw_material_batch_allocations
  for each row execute function forbid_mutation();

-- Backfill: every existing (branch, raw_material) with stock on hand gets
-- a legacy batch so FEFO consumption has something to draw from starting
-- with the very next movement after this migration runs.
insert into raw_material_batches (batch_number, branch_id, raw_material_id, received_date, expiry_date, quantity_received, quantity_remaining, source_type)
select
  'BAT-LEGACY-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  branch_id,
  raw_material_id,
  current_date,
  null,
  quantity,
  quantity,
  'legacy_balance'
from inventory_stock_raw_materials
where quantity > 0;

alter table raw_material_batches enable row level security;
alter table raw_material_batch_allocations enable row level security;
