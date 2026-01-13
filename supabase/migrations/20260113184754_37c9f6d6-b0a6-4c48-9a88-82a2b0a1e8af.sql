-- 1. Enable RLS on stores_public view and add appropriate policies
-- Views with security_invoker=on inherit the caller's permissions
-- But we need to ensure it's read-only for public access

-- Add explicit SELECT grant for stores_public (already done but let's ensure)
GRANT SELECT ON public.stores_public TO anon, authenticated;

-- Revoke any write permissions on the view
REVOKE INSERT, UPDATE, DELETE ON public.stores_public FROM anon, authenticated;

-- 2. Ensure orders table has NO anonymous SELECT access
-- The current policies should already prevent this, but let's add an explicit block
-- First check if there's a conflicting policy
DROP POLICY IF EXISTS "Anonymous cannot read orders" ON public.orders;

CREATE POLICY "Anonymous cannot read orders"
ON public.orders
FOR SELECT
TO anon
USING (false);

-- 3. Create a helper function for public access to stores data
-- This replaces direct access and is safer
CREATE OR REPLACE FUNCTION public.get_store_by_slug(p_slug text)
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
  IF p_slug IS NULL OR TRIM(p_slug) = '' THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    sp.slug,
    sp.logo_url,
    sp.opening_hours,
    sp.is_open_manual,
    sp.delivery_fee,
    sp.created_at,
    sp.updated_at
  FROM public.stores_public sp
  WHERE sp.slug = p_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_by_slug(text) TO anon, authenticated;