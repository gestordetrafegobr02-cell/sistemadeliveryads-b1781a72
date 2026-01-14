-- =========================================
-- COMPLETE SECURITY HARDENING MIGRATION
-- =========================================

-- STEP 1: Clean up existing RLS policies on orders table
DROP POLICY IF EXISTS "Anonymous cannot read orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can manage their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can delete their orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can place orders" ON public.orders;

-- STEP 2: Create secure RLS policies for orders table
-- Only store owners can SELECT orders (NO public access)
CREATE POLICY "Store owners can view their orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.owner_id = auth.uid()
  ));

-- Store owners can UPDATE their orders
CREATE POLICY "Store owners can manage their orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.owner_id = auth.uid()
  ));

-- Store owners can DELETE their orders
CREATE POLICY "Store owners can delete their orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.owner_id = auth.uid()
  ));

-- Anyone can INSERT orders (customers placing orders)
CREATE POLICY "Customers can place orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Block anonymous SELECT completely
CREATE POLICY "Anonymous cannot read orders"
  ON public.orders FOR SELECT
  TO anon
  USING (false);

-- STEP 3: Clean up and recreate profiles RLS policies
DROP POLICY IF EXISTS "Users manage own profile only" ON public.profiles;
DROP POLICY IF EXISTS "No anonymous access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Only authenticated users can manage their OWN profile
CREATE POLICY "Users manage own profile only"
  ON public.profiles FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Block all anonymous access
CREATE POLICY "No anonymous access"
  ON public.profiles FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- STEP 4: Ensure stores table is locked down
DROP POLICY IF EXISTS "Only owners can access stores" ON public.stores;
DROP POLICY IF EXISTS "Block anonymous access to stores" ON public.stores;

-- Only owners can access their stores
CREATE POLICY "Only owners can access stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Block anonymous access completely
CREATE POLICY "Block anonymous access to stores"
  ON public.stores FOR SELECT
  TO anon
  USING (false);

-- STEP 5: Recreate stores_public view to ensure ONLY safe columns
DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public
WITH (security_invoker = on) AS
  SELECT 
    id,
    name,
    slug,
    logo_url,
    opening_hours,
    is_open_manual,
    delivery_fee,
    created_at,
    updated_at
  FROM public.stores;

-- Grant SELECT only on the view
GRANT SELECT ON public.stores_public TO anon;
GRANT SELECT ON public.stores_public TO authenticated;

-- Revoke write operations
REVOKE INSERT, UPDATE, DELETE ON public.stores_public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.stores_public FROM authenticated;

-- STEP 6: Create/Update secure RPC for order details (customer self-lookup)
DROP FUNCTION IF EXISTS public.get_order_details(uuid, text);

CREATE OR REPLACE FUNCTION public.get_order_details(
  order_id_param uuid,
  session_token_param text
)
RETURNS TABLE (
  id uuid,
  status text,
  total numeric,
  items jsonb,
  payment_method text,
  created_at timestamptz,
  store_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF order_id_param IS NULL OR session_token_param IS NULL OR TRIM(session_token_param) = '' THEN
    RETURN;
  END IF;
  
  -- Return order only if session token matches (customer's own order)
  RETURN QUERY
  SELECT 
    o.id,
    o.status,
    o.total,
    o.items,
    o.payment_method,
    o.created_at,
    s.name as store_name
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = order_id_param
    AND o.customer_session_token = session_token_param;
END;
$$;

-- Grant execute to both roles
GRANT EXECUTE ON FUNCTION public.get_order_details(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_order_details(uuid, text) TO authenticated;

-- STEP 7: Create secure checkout info RPC (only returns PIX during payment)
DROP FUNCTION IF EXISTS public.get_store_checkout_info(text);

CREATE OR REPLACE FUNCTION public.get_store_checkout_info(store_slug_param text)
RETURNS TABLE (
  pix_key text,
  whatsapp text,
  store_name text,
  delivery_fee numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF store_slug_param IS NULL OR TRIM(store_slug_param) = '' THEN
    RETURN;
  END IF;
  
  -- Return checkout info only for active stores
  RETURN QUERY
  SELECT s.pix_key, s.whatsapp, s.name, s.delivery_fee
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug_param))
    AND s.is_open_manual IS NOT FALSE;
END;
$$;

-- Grant execute to both roles
GRANT EXECUTE ON FUNCTION public.get_store_checkout_info(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_checkout_info(text) TO authenticated;

-- STEP 8: Ensure all existing secure RPCs have proper grants
GRANT EXECUTE ON FUNCTION public.get_public_store_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_store_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_payment_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_payment_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_pixel_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_pixel_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid, text) TO authenticated;