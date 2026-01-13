-- Fix the security definer view issue by using security_invoker = on
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

-- Grant SELECT on the view
GRANT SELECT ON public.stores_public TO anon, authenticated;

-- Revoke write operations
REVOKE INSERT, UPDATE, DELETE ON public.stores_public FROM anon, authenticated;

-- Now we need a way for the view to work for anon users
-- Since security_invoker=on means the view uses caller's permissions,
-- and anon has USING(false) on stores, the view won't work for anon.
-- Solution: Create a SECURITY DEFINER function to fetch public store data

CREATE OR REPLACE FUNCTION public.get_public_store_by_slug(store_slug text)
RETURNS TABLE(
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
SET search_path = 'public'
AS $$
BEGIN
  IF store_slug IS NULL OR TRIM(store_slug) = '' THEN
    RETURN;
  END IF;
  
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

GRANT EXECUTE ON FUNCTION public.get_public_store_by_slug(text) TO anon, authenticated;