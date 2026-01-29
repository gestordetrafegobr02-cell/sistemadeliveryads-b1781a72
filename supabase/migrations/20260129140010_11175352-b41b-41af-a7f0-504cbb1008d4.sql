-- Add cover_url column to stores table for store branding
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;

-- Add cover_url to the get_public_store_by_slug function so it's available to shoppers
DROP FUNCTION IF EXISTS get_public_store_by_slug(TEXT);

CREATE OR REPLACE FUNCTION get_public_store_by_slug(store_slug TEXT)
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
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
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
    (s.trial_expires_at IS NOT NULL AND s.trial_expires_at < NOW()) AS is_trial_expired,
    s.created_at,
    s.updated_at
  FROM stores s
  WHERE s.slug = store_slug 
    AND s.is_active = true;
$$;