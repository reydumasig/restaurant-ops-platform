-- Fixes a real precision bug present since the original Phase 1 seed:
-- raw_materials.cost_per_unit was numeric(12,2) — only 2 decimal places —
-- while per-gram/per-mL costs routinely need 4 (e.g. Rice at ₱0.052/g).
-- Every such cost has been silently rounded on every write since launch,
-- distorting Executive Dashboard inventory value by up to ~18% on some
-- items. Widening this to match purchase_order_items.unit_cost's
-- precision (numeric(12,4)) — existing rounded values are NOT recoverable
-- from within the database and are re-synced from the seed file's
-- full-precision literals in a follow-up script.

alter table raw_materials
  alter column cost_per_unit type numeric(12, 4);
