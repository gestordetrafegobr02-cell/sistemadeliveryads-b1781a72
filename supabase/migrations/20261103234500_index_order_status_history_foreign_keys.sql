create index if not exists order_status_history_store_id_idx on public.order_status_history(store_id);
create index if not exists order_status_history_changed_by_idx on public.order_status_history(changed_by);
