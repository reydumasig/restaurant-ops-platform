-- Ops Phase 2, Milestone 3: Stock Count / Cycle Count. See CLAUDE.md's
-- Phase Gate Protocol for authorization.
--
-- Design: a count session snapshots the system's current ("expected")
-- quantity for every item of one type (raw material or product) at a
-- branch when it starts. Staff enter what they physically counted per
-- item. Completing the session applies an adjustment for every item whose
-- counted quantity differs from expected — reusing Phase 1's existing
-- adjustment_increase/adjustment_decrease movement types (no new ledger
-- movement type needed; this genuinely is "inventory adjustments beyond
-- basic Phase 1 adjustments", not a different mechanism). No approval
-- workflow here (unlike waste) — not asked for, and the same roles who
-- can already do a manual adjustment in Phase 1 can start/complete a count.

create table stock_counts (
  id uuid primary key default gen_random_uuid(),
  count_number text not null unique,
  branch_id uuid not null references branches (id),
  item_type text not null check (item_type in ('raw_material', 'product')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  started_by uuid not null references users (id),
  completed_by uuid references users (id),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index stock_counts_branch_id_idx on stock_counts (branch_id);

create table stock_count_items (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references stock_counts (id),
  raw_material_id uuid references raw_materials (id),
  product_id uuid references products (id),
  expected_quantity numeric(14, 4) not null,
  counted_quantity numeric(14, 4),
  created_at timestamptz not null default now(),
  check (
    (raw_material_id is not null and product_id is null) or
    (raw_material_id is null and product_id is not null)
  )
);
create index stock_count_items_count_id_idx on stock_count_items (stock_count_id);

alter table stock_counts enable row level security;
alter table stock_count_items enable row level security;
