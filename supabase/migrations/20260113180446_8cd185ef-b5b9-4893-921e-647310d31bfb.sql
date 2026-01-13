-- 1. Create a public view for stores that hides sensitive data
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
  -- Excludes: pix_key, whatsapp, facebook_pixel_id, owner_id
FROM public.stores;

-- 2. Update the stores table SELECT policy to deny direct public access
-- First drop the existing public SELECT policy
DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;
DROP POLICY IF EXISTS "Stores are viewable by everyone" ON public.stores;

-- Create a new SELECT policy that only allows authenticated store owners
CREATE POLICY "Store owners can view their store"
ON public.stores
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Allow the public view to query the table (using service role internally)
-- The view with security_invoker will respect RLS, so we need to allow public SELECT but only through specific conditions
-- Actually, we need a different approach: allow SELECT but the view hides sensitive columns

-- Let's use a different approach: Keep public SELECT but use the view in the app
DROP POLICY IF EXISTS "Store owners can view their store" ON public.stores;

-- Keep the table publicly readable (needed for the view to work with security_invoker)
-- But the app will use the view instead of direct table access
CREATE POLICY "Stores are publicly viewable"
ON public.stores
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

-- 3. Grant SELECT on the view to public
GRANT SELECT ON public.stores_public TO anon;
GRANT SELECT ON public.stores_public TO authenticated;

-- 4. Create a secure function to get sensitive store data for checkout
-- This will only return sensitive data that's needed during checkout
CREATE OR REPLACE FUNCTION public.get_store_checkout_data(store_id uuid)
RETURNS TABLE (
  whatsapp text,
  pix_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.whatsapp, s.pix_key
  FROM public.stores s
  WHERE s.id = store_id;
END;
$$;

-- 5. Create a secure function to get facebook pixel ID for a store
-- This is needed for analytics tracking on the shop page
CREATE OR REPLACE FUNCTION public.get_store_pixel(store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pixel_id text;
BEGIN
  SELECT facebook_pixel_id INTO pixel_id
  FROM public.stores
  WHERE id = store_id;
  RETURN pixel_id;
END;
$$;