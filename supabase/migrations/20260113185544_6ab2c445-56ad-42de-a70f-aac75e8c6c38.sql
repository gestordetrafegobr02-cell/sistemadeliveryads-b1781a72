-- 1. CLEAN UP: Remove all conflicting policies on stores
DROP POLICY IF EXISTS "No direct public access to stores" ON public.stores;
DROP POLICY IF EXISTS "Authenticated users see own stores only" ON public.stores;
DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;

-- 2. CREATE STRICT RLS POLICIES FOR STORES TABLE
-- Policy: Only store owners can do ANY operation on their stores
-- This prevents ALL public access to sensitive columns like pix_key, whatsapp, facebook_pixel_id
CREATE POLICY "Only owners can access stores"
ON public.stores
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy: Block ALL anonymous access to stores table
CREATE POLICY "Block anonymous access to stores"
ON public.stores
FOR SELECT
TO anon
USING (false);

-- 3. ENSURE stores_public VIEW IS PROPERLY CONFIGURED
-- Drop and recreate to ensure it only has safe columns
DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public
WITH (security_invoker = off) AS
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
-- Note: pix_key, whatsapp, facebook_pixel_id, owner_id are EXCLUDED

-- Grant SELECT on the view (no RLS needed on views)
GRANT SELECT ON public.stores_public TO anon, authenticated;

-- Explicitly revoke write operations
REVOKE INSERT, UPDATE, DELETE ON public.stores_public FROM anon, authenticated;

-- 4. DROP OLD RPC FUNCTIONS
DROP FUNCTION IF EXISTS public.get_payment_info(uuid);
DROP FUNCTION IF EXISTS public.get_store_whatsapp(uuid);
DROP FUNCTION IF EXISTS public.get_store_pixel(uuid);

-- 5. CREATE SECURE RPC: get_store_payment_data by slug
-- This is for checkout - returns pix_key and whatsapp only for valid stores
CREATE OR REPLACE FUNCTION public.get_store_payment_data(store_slug text)
RETURNS TABLE(pix_key text, whatsapp text, store_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 6. CREATE SECURE RPC: get_store_pixel_by_slug
CREATE OR REPLACE FUNCTION public.get_store_pixel_by_slug(store_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 7. GRANT EXECUTE permissions
GRANT EXECUTE ON FUNCTION public.get_store_payment_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_pixel_by_slug(text) TO anon, authenticated;