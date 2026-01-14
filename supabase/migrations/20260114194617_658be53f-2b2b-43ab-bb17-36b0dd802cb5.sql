-- Fix the security definer view issue by recreating without SECURITY DEFINER
-- The view simply filters active stores, which is safe
DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  opening_hours,
  is_open_manual,
  delivery_fee,
  is_active,
  created_at,
  updated_at
FROM public.stores
WHERE is_active = true;

-- Allow public select on the view
GRANT SELECT ON public.stores_public TO anon, authenticated;