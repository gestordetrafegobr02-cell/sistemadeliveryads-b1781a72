-- =============================================
-- FINAL DATABASE HARDENING - SECURITY LOCKDOWN
-- =============================================

-- 1. STORES TABLE: Ensure complete lockdown for anonymous users
-- Drop any existing policies that might allow public access
DROP POLICY IF EXISTS "Public can view basic store info" ON public.stores;
DROP POLICY IF EXISTS "Stores are publicly readable" ON public.stores;
DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;

-- Ensure the block policy exists and is correct
DROP POLICY IF EXISTS "Block anonymous access to stores" ON public.stores;
CREATE POLICY "Block anonymous access to stores"
  ON public.stores
  FOR SELECT
  TO anon
  USING (false);

-- Ensure owner-only access for authenticated users
DROP POLICY IF EXISTS "Owners can manage own store" ON public.stores;
DROP POLICY IF EXISTS "Only owners can access stores" ON public.stores;
CREATE POLICY "Only owners can access stores"
  ON public.stores
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 2. ORDERS TABLE: Ensure anonymous users cannot read ANY orders
DROP POLICY IF EXISTS "Anonymous cannot read orders" ON public.orders;
CREATE POLICY "Anonymous cannot read orders"
  ON public.orders
  FOR SELECT
  TO anon
  USING (false);

-- Ensure store owners can still view their orders
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;
CREATE POLICY "Store owners can view their orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.owner_id = auth.uid()
  ));

-- 3. Recreate stores_public view with security_invoker to inherit RLS
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public
WITH (security_invoker = on)
AS SELECT 
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

-- Grant SELECT on view to public (the view itself excludes sensitive fields)
GRANT SELECT ON public.stores_public TO anon;
GRANT SELECT ON public.stores_public TO authenticated;

-- Revoke any modification permissions on the view
REVOKE INSERT, UPDATE, DELETE ON public.stores_public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.stores_public FROM authenticated;

-- 4. Update the get_public_store_by_slug function to be the ONLY way to access store data
-- This function bypasses RLS but only returns non-sensitive fields
DROP FUNCTION IF EXISTS public.get_public_store_by_slug(text);
CREATE OR REPLACE FUNCTION public.get_public_store_by_slug(store_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  opening_hours jsonb,
  is_open_manual boolean,
  delivery_fee numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF store_slug IS NULL OR TRIM(store_slug) = '' THEN
    RETURN;
  END IF;
  
  -- Return only non-sensitive store data
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.logo_url,
    s.opening_hours,
    s.is_open_manual,
    s.delivery_fee,
    s.created_at,
    s.updated_at
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug));
END;
$$;

-- 5. Ensure get_store_payment_data is secured and rate-limit friendly
DROP FUNCTION IF EXISTS public.get_store_payment_data(text);
CREATE OR REPLACE FUNCTION public.get_store_payment_data(store_slug text)
RETURNS TABLE (
  pix_key text,
  whatsapp text,
  store_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF store_slug IS NULL OR TRIM(store_slug) = '' THEN
    RETURN;
  END IF;
  
  -- Return payment data only for active stores
  RETURN QUERY
  SELECT s.pix_key, s.whatsapp, s.name
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug))
    AND s.is_open_manual IS NOT FALSE;
END;
$$;

-- 6. Ensure get_store_pixel_by_slug is properly secured
DROP FUNCTION IF EXISTS public.get_store_pixel_by_slug(text);
CREATE OR REPLACE FUNCTION public.get_store_pixel_by_slug(store_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pixel_id text;
BEGIN
  IF store_slug IS NULL OR TRIM(store_slug) = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT s.facebook_pixel_id INTO pixel_id
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug));
  
  RETURN pixel_id;
END;
$$;

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION public.get_public_store_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_store_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_payment_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_payment_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_pixel_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_pixel_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid, text) TO authenticated;