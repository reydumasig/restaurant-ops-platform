-- Time Keeping — minimal staff clock in/out tracking, added as new scope
-- outside the original four-phase proposal (see /CLAUDE.md). Deliberately
-- excludes payroll computation, overtime/night-diff/holiday classification,
-- leave management, and approval workflows — payroll itself is CASA OS
-- scope, and the rest is unnecessary complexity for a 5-branch restaurant.
-- Just raw punches (append-only, same audit philosophy as the stock ledger)
-- plus a computed daily-hours report.

create table time_punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  branch_id uuid not null references branches (id),
  type text not null check (type in ('in', 'out')),
  reason text check (reason in ('short_break', 'lunch', 'end_of_shift')),
  -- clock_timestamp(), not now() — now() is frozen at transaction start, so
  -- concurrent punches serialized by the advisory lock in recordPunch()
  -- could otherwise still get identical timestamps despite executing in
  -- strict sequence.
  punched_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  check ((type = 'out' and reason is not null) or (type = 'in' and reason is null))
);
create index time_punches_user_id_idx on time_punches (user_id, punched_at);
create index time_punches_branch_id_idx on time_punches (branch_id, punched_at);
create trigger time_punches_forbid_update before update on time_punches
  for each row execute function forbid_mutation();
create trigger time_punches_forbid_delete before delete on time_punches
  for each row execute function forbid_mutation();

alter table time_punches enable row level security;
