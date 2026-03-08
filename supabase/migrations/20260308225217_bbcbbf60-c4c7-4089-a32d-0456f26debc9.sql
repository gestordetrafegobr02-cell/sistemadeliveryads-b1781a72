-- Remove the overly permissive public SELECT policy on stores.
-- Public access is already safely handled by:
--   stores_public VIEW, get_public_store_by_slug() RPC,
--   get_store_checkout_info() RPC, get_store_payment_data() RPC
DROP POLICY IF EXISTS "Anyone can view active stores for checkout" ON public.stores;