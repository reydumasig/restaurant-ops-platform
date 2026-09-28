-- Ops Phase 2 — Comp / Giveaway Tracking
--
-- Items given away as staff perks, VIP comps, or promotional giveaways
-- still need to deduct real inventory, but they are not the same thing as
-- waste (spoilage/damage/expiry): they're intentional, not loss, and the
-- business wants to see them as their own category rather than mixed into
-- waste reports. Mirrors waste_reports' structure and approval workflow
-- exactly, with its own reason codes and its own stock ledger movement
-- type (comp_writeoff) so it's distinguishable in reports.

alter table stock_ledger_raw_materials drop constraint stock_ledger_rm_movement_type_check;
alter table stock_ledger_raw_materials add constraint stock_ledger_rm_movement_type_check
  check (movement_type in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_consume', 'sale_deduction', 'purchase_receipt', 'waste_writeoff', 'comp_writeoff'));

alter table stock_ledger_products drop constraint stock_ledger_p_movement_type_check;
alter table stock_ledger_products add constraint stock_ledger_p_movement_type_check
  check (movement_type in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_yield', 'sale_deduction', 'waste_writeoff', 'comp_writeoff'));

create table comp_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  item_type text not null,
  raw_material_id uuid references raw_materials(id),
  product_id uuid references products(id),
  quantity numeric(14, 4) not null,
  reason text not null,
  notes text,
  status text not null default 'pending',
  reported_by uuid not null references users(id),
  reviewed_by uuid references users(id),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint comp_reports_item_type_check check (item_type in ('raw_material', 'product')),
  constraint comp_reports_reason_check check (reason in ('staff_perk', 'customer_comp', 'promo_giveaway')),
  constraint comp_reports_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint comp_reports_item_ref_check check (
    (item_type = 'raw_material' and raw_material_id is not null and product_id is null) or
    (item_type = 'product' and product_id is not null and raw_material_id is null)
  )
);

create index comp_reports_branch_id_idx on comp_reports(branch_id, created_at);
create index comp_reports_status_idx on comp_reports(status);

alter table comp_reports enable row level security;
