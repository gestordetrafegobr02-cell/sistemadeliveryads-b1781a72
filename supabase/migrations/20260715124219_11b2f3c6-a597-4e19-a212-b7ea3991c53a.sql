
-- Revoke default PUBLIC grant on admin/owner-only functions
DO $$
DECLARE
  fn_signatures text[] := ARRAY[
    'public.get_platform_stats()',
    'public.get_all_orders_admin()',
    'public.get_all_stores_admin()',
    'public.get_all_users_admin()',
    'public.delete_store_master(uuid)',
    'public.toggle_store_active(uuid)',
    'public.update_store_trial(uuid, timestamptz)',
    'public.update_global_setting(text, text)',
    'public.get_global_setting(text)',
    'public.create_store_from_template(text, text, text, uuid)',
    'public.create_store_manual(text, text, text, integer, text)',
    'public.create_user_store_with_template(text, text, text)',
    'public.list_store_members(uuid)',
    'public.get_store_stats(uuid, timestamptz, timestamptz)',
    'public.get_order_details_owner(uuid)',
    'public.set_store_mercadopago_token(uuid, text)',
    'public.has_store_mercadopago_token(uuid)',
    'public.cancel_pdv_session(uuid)',
    'public.close_pdv_session(uuid, text, numeric)',
    'public.open_pdv_session(uuid, uuid, text, text)',
    'public.mark_abandoned_cart_converted(uuid, uuid)',
    'public.process_order_cashback(uuid, uuid, text, numeric, numeric)',
    'public.is_admin()',
    'public.is_master_admin()',
    'public.has_role(uuid, app_role)',
    'public.get_my_store()',
    'public.get_store_role(uuid, uuid)',
    'public.has_store_role(uuid, uuid, store_role[])',
    'public.has_store_access(uuid, uuid)',
    'public.is_store_owner(uuid, uuid)',
    'public.handle_new_user()',
    'public.update_updated_at_column()',
    'public.validate_order_insert()',
    'public.recalc_pdv_session_totals()',
    'public.notify_new_order_push()'
  ];
  sig text;
BEGIN
  FOREACH sig IN ARRAY fn_signatures LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
  END LOOP;
END $$;
