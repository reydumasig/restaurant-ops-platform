-- Internal POS checkout support (order entry replaces the client's prior
-- external POS — see conversation notes; separately quoted from the Ops
-- Phase 1 SOW, but built now per explicit client-side direction).

-- A dish sold via the POS is cooked to order and deducts its RAW MATERIALS
-- directly through its recipe at the point of sale — it is not pre-produced
-- via a Production Run first. Retail items with no recipe (drinks, ice
-- cream) still deduct PRODUCT stock directly, as before. Both need
-- 'sale_deduction' as a valid movement type.
alter table stock_ledger_raw_materials drop constraint stock_ledger_raw_materials_movement_type_check;
alter table stock_ledger_raw_materials add constraint stock_ledger_rm_movement_type_check check (movement_type in (
  'stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease',
  'transfer_out', 'transfer_in', 'production_consume', 'sale_deduction'
));

alter table pos_sales
  add column discount_type text not null default 'none' check (discount_type in ('none', 'senior_pwd')),
  add column discount_amount numeric(12, 2) not null default 0,
  add column tendered_amount numeric(12, 2),
  add column change_amount numeric(12, 2);

comment on column pos_sales.discount_amount is 'Standard 20% senior/PWD discount approximation on the VAT-exclusive amount. Not guaranteed BIR-exact — client should verify official receipt compliance separately.';
