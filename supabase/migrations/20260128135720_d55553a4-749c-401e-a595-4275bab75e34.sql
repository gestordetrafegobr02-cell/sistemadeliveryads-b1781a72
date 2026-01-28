-- Drop and recreate get_all_stores_admin with new return type
DROP FUNCTION IF EXISTS public.get_all_stores_admin();

CREATE OR REPLACE FUNCTION public.get_all_stores_admin()
RETURNS TABLE(
  id uuid, 
  name text, 
  slug text, 
  owner_id uuid, 
  owner_email text, 
  whatsapp text, 
  pix_key text, 
  delivery_fee numeric, 
  is_open_manual boolean, 
  is_active boolean,
  trial_expires_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.owner_id,
    p.email as owner_email,
    s.whatsapp,
    s.pix_key,
    s.delivery_fee,
    s.is_open_manual,
    s.is_active,
    s.trial_expires_at,
    s.created_at
  FROM public.stores s
  LEFT JOIN public.profiles p ON p.id = s.owner_id
  ORDER BY s.created_at DESC;
END;
$$;