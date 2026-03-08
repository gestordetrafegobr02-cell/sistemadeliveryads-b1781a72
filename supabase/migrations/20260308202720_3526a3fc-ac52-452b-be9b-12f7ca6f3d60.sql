
DROP FUNCTION IF EXISTS public.get_order_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_order_by_id(p_order_id uuid)
RETURNS TABLE(
  id uuid,
  status text,
  total numeric,
  items jsonb,
  payment_method text,
  created_at timestamp with time zone,
  store_name text,
  store_logo_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_order_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.status,
    o.total,
    o.items,
    o.payment_method,
    o.created_at,
    s.name as store_name,
    s.logo_url as store_logo_url
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id;
END;
$$;
