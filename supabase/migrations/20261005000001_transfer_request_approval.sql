-- Branch-initiated stock requests
--
-- Previously creating a transfer WAS the dispatch — stock left the source
-- branch immediately, with no way for an ordinary branch user to just ask
-- for stock and have the commissary decide whether/how much to send. This
-- adds a genuine request -> approve (dispatch) -> receive lifecycle:
-- 'pending' (requested, no stock moved yet) -> 'in_transit' (approved,
-- dispatched) -> 'received'. The existing push-and-dispatch-immediately
-- flow (createTransfer) is unchanged and keeps working exactly as before;
-- it just also records quantity_requested = quantity_sent for consistency
-- with the new request-origin rows.

alter table stock_transfers add column approved_by uuid references users(id);
alter table stock_transfers add column approved_at timestamptz;

alter table stock_transfer_items_raw_materials add column quantity_requested numeric(14, 4);
update stock_transfer_items_raw_materials set quantity_requested = quantity_sent where quantity_requested is null;
alter table stock_transfer_items_raw_materials alter column quantity_requested set not null;
alter table stock_transfer_items_raw_materials alter column quantity_sent drop not null;

alter table stock_transfer_items_products add column quantity_requested numeric(14, 4);
update stock_transfer_items_products set quantity_requested = quantity_sent where quantity_requested is null;
alter table stock_transfer_items_products alter column quantity_requested set not null;
alter table stock_transfer_items_products alter column quantity_sent drop not null;
