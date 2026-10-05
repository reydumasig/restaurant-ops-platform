-- Recipes that output a raw material, not just a product
--
-- Some produced items are never sold directly — they're consumed as an
-- ingredient inside OTHER recipes, the same way CLQ (Marinated Chicken
-- Leg Quarter), Grilled Liempo, Lechon Kawali, and Fried Hito already
-- work in this data. Those semi-finished items were previously entered
-- as untracked manual stock-ins, with no record of what raw materials
-- went into making them. This lets a recipe output to a raw material
-- instead of a product, so that conversion goes through Production (and
-- its automatic raw-material deduction + FEFO batch creation) like
-- everything else.

alter table recipes alter column product_id drop not null;
alter table recipes add column output_raw_material_id uuid references raw_materials(id);
alter table recipes add constraint recipes_output_ref_check check (
  (product_id is not null and output_raw_material_id is null) or
  (product_id is null and output_raw_material_id is not null)
);
create index recipes_output_raw_material_id_idx on recipes(output_raw_material_id);

alter table stock_ledger_raw_materials drop constraint stock_ledger_rm_movement_type_check;
alter table stock_ledger_raw_materials add constraint stock_ledger_rm_movement_type_check
  check (movement_type in ('stock_in', 'stock_out', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'production_consume', 'sale_deduction', 'purchase_receipt', 'waste_writeoff', 'comp_writeoff', 'production_yield'));

alter table raw_material_batches drop constraint raw_material_batches_source_type_check;
alter table raw_material_batches add constraint raw_material_batches_source_type_check
  check (source_type in ('stock_in', 'purchase_receipt', 'transfer_in', 'adjustment_increase', 'legacy_balance', 'production_yield'));
