-- Drop and recreate the function with primary_color in return type
DROP FUNCTION IF EXISTS public.get_public_store_by_slug(TEXT);

CREATE FUNCTION public.get_public_store_by_slug(store_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  cover_url TEXT,
  delivery_fee NUMERIC,
  opening_hours JSONB,
  is_open_manual BOOLEAN,
  is_trial_expired BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  primary_color TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.logo_url,
    s.cover_url,
    s.delivery_fee,
    s.opening_hours,
    s.is_open_manual,
    CASE 
      WHEN s.trial_expires_at IS NOT NULL AND s.trial_expires_at < NOW() THEN TRUE 
      ELSE FALSE 
    END as is_trial_expired,
    s.created_at,
    s.updated_at,
    s.primary_color
  FROM public.stores s
  WHERE s.slug = store_slug
    AND s.is_active = TRUE;
$$;