-- Drop and recreate get_public_store_by_slug with trial expiration check
DROP FUNCTION IF EXISTS public.get_public_store_by_slug(text);

CREATE FUNCTION public.get_public_store_by_slug(store_slug text)
RETURNS TABLE(
  id uuid, 
  name text, 
  slug text, 
  logo_url text, 
  opening_hours jsonb, 
  is_open_manual boolean, 
  delivery_fee numeric, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone,
  is_trial_expired boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF store_slug IS NULL OR TRIM(store_slug) = '' THEN
    RETURN;
  END IF;
  
  IF LENGTH(store_slug) > 100 THEN
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
    s.updated_at,
    CASE 
      WHEN s.trial_expires_at IS NOT NULL AND s.trial_expires_at < now() THEN true
      ELSE false
    END as is_trial_expired
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug));
END;
$function$;