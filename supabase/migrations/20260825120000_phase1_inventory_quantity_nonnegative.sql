-- Defense-in-depth: applyStockMovement() already rejects any update that
-- would drive quantity negative, but a DB-level constraint means that
-- guarantee holds regardless of code path (including any future direct
-- writes), not just the current single choke point.

alter table inventory_stock_raw_materials
  add constraint inventory_stock_rm_quantity_nonnegative check (quantity >= 0);

alter table inventory_stock_products
  add constraint inventory_stock_p_quantity_nonnegative check (quantity >= 0);
