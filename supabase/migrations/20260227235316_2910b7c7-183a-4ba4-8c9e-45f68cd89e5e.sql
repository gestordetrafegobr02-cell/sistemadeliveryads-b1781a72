-- Grant table-level SELECT to anon and authenticated for public-facing tables
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.product_modifiers TO anon, authenticated;
GRANT SELECT ON public.store_templates TO anon, authenticated;
GRANT SELECT ON public.global_settings TO anon, authenticated;
GRANT SELECT ON public.stores_public TO anon, authenticated;
GRANT SELECT ON public.upsell_rules TO anon, authenticated;

-- Grant INSERT on orders and abandoned_carts (customers place orders anonymously)
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT INSERT, SELECT ON public.abandoned_carts TO anon, authenticated;
GRANT UPDATE ON public.abandoned_carts TO authenticated;

-- Grant full access to authenticated users on tables they manage via RLS
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.product_modifiers TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.abandoned_carts TO authenticated;
GRANT ALL ON public.upsell_rules TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.global_settings TO authenticated;

-- Grant EXECUTE on all public RPC functions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_store_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_payment_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_pixel_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_checkout_info(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_details(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_abandoned_cart(uuid, uuid, text, text, jsonb, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_abandoned_cart_converted(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_upsell_products(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_personalized_upsell(uuid, uuid[], integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_setting(text) TO anon, authenticated;

-- Owner/admin-only functions (authenticated only)
GRANT EXECUTE ON FUNCTION public.get_store_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_details_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_store_with_template(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_from_template(text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_stores_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_orders_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_store_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_store_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_trial(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_global_setting(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;