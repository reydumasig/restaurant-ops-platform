-- POS Shift Management: a cashier opens a shift with a starting cash
-- float, rings sales against it, and closes it with a physical cash
-- count. Expected cash = starting float + every sale tagged to that
-- shift (this POS only handles cash tender — no card/e-wallet split —
-- so every recorded sale counts toward the cash total).
--
-- This is a feature of the internal POS module itself, which was built
-- as a separate, separately-quoted add-on outside the Ops Platform's
-- Phase 1-3 SOW (per the client's own earlier direction to replace their
-- POS entirely). It is NOT part of CASA OS's "Cash management, bank
-- reconciliation" scope (a separate, locked, 5-phase accounting
-- contract) — this is a till/drawer control tied to this register's own
-- recorded sales, not ledger- or bank-account-level cash management.
--
-- Design: at most one OPEN shift per branch, enforced by a partial
-- unique index (not just an app-level check) so two concurrent "open
-- shift" requests can't both succeed. Sales are tagged to whichever
-- shift is open at the branch when the sale is created — nullable, so
-- branches/sales that don't use shifts (or predate this feature) are
-- unaffected.

create table pos_shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  status text not null default 'open' check (status in ('open', 'closed')),
  starting_cash numeric(12, 2) not null check (starting_cash >= 0),
  opened_by uuid not null references users (id),
  opened_at timestamptz not null default now(),
  closed_by uuid references users (id),
  closed_at timestamptz,
  counted_cash numeric(12, 2),
  expected_cash numeric(12, 2),
  cash_variance numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);
create index pos_shifts_branch_id_idx on pos_shifts (branch_id, opened_at);
create unique index pos_shifts_one_open_per_branch on pos_shifts (branch_id) where status = 'open';

alter table pos_sales add column shift_id uuid references pos_shifts (id);
create index pos_sales_shift_id_idx on pos_sales (shift_id);

alter table pos_shifts enable row level security;
