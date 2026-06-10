-- Force orders to be created only via create_public_order RPC (server-side total recompute)
DROP POLICY IF EXISTS "Customers can place orders" ON public.orders;

-- Force abandoned carts to be created only via upsert_abandoned_cart RPC
DROP POLICY IF EXISTS "Anyone can create abandoned carts" ON public.abandoned_carts;

-- Remove public SELECT on upsell_rules (still accessible via get_personalized_upsell SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Upsell rules are publicly viewable" ON public.upsell_rules;