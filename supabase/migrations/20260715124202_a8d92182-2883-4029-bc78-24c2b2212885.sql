
-- Revoke anon EXECUTE on admin/owner-only SECURITY DEFINER functions.
-- Public menu / checkout / order-status functions remain callable by anon.

REVOKE EXECUTE ON FUNCTION public.get_platform_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_orders_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_stores_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_store_master(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_store_active(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_store_trial(uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_global_setting(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_global_setting(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_store_from_template(text, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_store_manual(text, text, text, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_user_store_with_template(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_store_members(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_store_stats(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_order_details_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_store_mercadopago_token(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_store_mercadopago_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_pdv_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_pdv_session(uuid, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.open_pdv_session(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_abandoned_cart_converted(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_order_cashback(uuid, uuid, text, numeric, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_master_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_store() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_store_role(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_store_role(uuid, uuid, store_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_store_access(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) FROM anon;

-- Ensure authenticated role can still execute these
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_orders_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_stores_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_store_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_store_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_trial(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_global_setting(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_setting(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_from_template(text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_manual(text, text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_store_with_template(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_store_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_stats(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_details_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_store_mercadopago_token(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_store_mercadopago_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pdv_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_pdv_session(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_pdv_session(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_abandoned_cart_converted(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_cashback(uuid, uuid, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_store() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_store_role(uuid, uuid, store_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_store_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) TO authenticated;
