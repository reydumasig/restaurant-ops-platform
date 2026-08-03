-- Lets stock-in be entered in the unit staff actually buy in (sack, gallon,
-- pack, jar...) while the ledger and reports stay in one consistent base
-- unit (raw_materials.unit_id). Purely a data-entry convenience for Phase 1's
-- existing stock-in flow — not procurement/supplier management (Ops Phase 2).

alter table raw_materials
  add column purchase_unit_label text,
  add column purchase_unit_conversion_factor numeric(14, 4);

comment on column raw_materials.purchase_unit_label is 'Free-text label for the unit staff purchase in, e.g. "Sack (25kg)", "Gallon". Null if purchased directly in the base unit.';
comment on column raw_materials.purchase_unit_conversion_factor is 'Base units per one purchase unit, e.g. 25000 (grams) for a 25kg sack when unit_id is grams.';
