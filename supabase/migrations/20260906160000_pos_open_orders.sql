-- POS Open Orders: a table/tab stays 'open' while items get added over
-- the course of the visit (each addition deducts stock immediately, same
-- as an instant sale — the food is prepared and consumed before the bill
-- is settled) and only becomes 'closed' when the customer pays. Multiple
-- orders can be open at once, one per table/tab.
--
-- Existing rows default to 'closed' — every pos_sales row created before
-- this migration was already a completed, paid transaction under the old
-- single-shot checkout flow (createSale), which remains unchanged and
-- still produces 'closed' rows directly (useful for a future external
-- POS sales-sync import, which receives already-completed transactions).
--
-- Every read path that sums or reports on pos_sales revenue (daily sales,
-- shift cash reconciliation, Phase 3 profitability analytics) must filter
-- to status = 'closed' — an open tab's running total isn't revenue yet.

alter table pos_sales
  add column status text not null default 'closed',
  add column table_label text;

alter table pos_sales
  add constraint pos_sales_status_check check (status in ('open', 'closed', 'void'));

create index pos_sales_status_idx on pos_sales (branch_id, status);
