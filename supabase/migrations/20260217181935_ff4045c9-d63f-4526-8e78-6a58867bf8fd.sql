
-- Add new theme columns to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bg_color text DEFAULT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS card_style text DEFAULT 'rounded';

-- Update RPC to return new fields
DROP FUNCTION IF EXISTS public.get_public_store_by_slug(text);

CREATE FUNCTION public.get_public_store_by_slug(store_slug text)
 RETURNS TABLE(id uuid, name text, logo_url text, cover_url text, delivery_fee numeric, opening_hours jsonb, is_open_manual boolean, is_trial_expired boolean, created_at timestamp with time zone, updated_at timestamp with time zone, primary_color text, store_template_style text, bg_color text, card_style text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    s.primary_color,
    s.store_template_style,
    s.bg_color,
    s.card_style
  FROM public.stores s
  WHERE s.slug = store_slug
    AND s.is_active = TRUE;
$function$;
