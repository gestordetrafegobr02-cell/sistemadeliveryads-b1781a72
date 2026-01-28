-- Add trial_expires_at column to stores table for subscription management
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '14 days');

-- Update the get_all_stores_admin function to include trial_expires_at
CREATE OR REPLACE FUNCTION public.get_all_stores_admin()
 RETURNS TABLE(id uuid, name text, slug text, owner_id uuid, owner_email text, whatsapp text, pix_key text, delivery_fee numeric, is_open_manual boolean, is_active boolean, trial_expires_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only master admin or admins can call this function
  IF NOT public.is_master_admin() AND NOT public.has_role(auth.uid(), 'admin') THEN
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
$function$;

-- Also update get_all_orders_admin and get_all_users_admin to allow master admin
CREATE OR REPLACE FUNCTION public.get_all_orders_admin()
 RETURNS TABLE(id uuid, store_id uuid, store_name text, customer_name text, customer_phone text, items jsonb, total numeric, status text, address text, payment_method text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only master admin or admins can call this function
  IF NOT public.is_master_admin() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.store_id,
    st.name as store_name,
    o.customer_name,
    o.customer_phone,
    o.items,
    o.total,
    o.status,
    o.address,
    o.payment_method,
    o.created_at
  FROM public.orders o
  LEFT JOIN public.stores st ON st.id = o.store_id
  ORDER BY o.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
 RETURNS TABLE(id uuid, email text, has_store boolean, store_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only master admin or admins can call this function
  IF NOT public.is_master_admin() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    (s.id IS NOT NULL) as has_store,
    s.name as store_name,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.stores s ON s.owner_id = p.id
  ORDER BY p.created_at DESC;
END;
$function$;

-- Function to update trial date (for TrialEditor component)
CREATE OR REPLACE FUNCTION public.update_store_trial(p_store_id uuid, p_trial_date timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Master admin access required';
  END IF;

  UPDATE public.stores 
  SET trial_expires_at = p_trial_date, updated_at = now()
  WHERE id = p_store_id;

  RETURN true;
END;
$function$;