-- Drop the existing function first to change return type
DROP FUNCTION IF EXISTS get_store_checkout_info(text);

-- Create secure checkout RPC that returns necessary payment data
CREATE OR REPLACE FUNCTION get_store_checkout_info(store_slug_param text)
RETURNS TABLE (
  store_name text,
  pix_key text,
  whatsapp text,
  delivery_fee numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF store_slug_param IS NULL OR TRIM(store_slug_param) = '' THEN
    RETURN;
  END IF;
  
  -- Sanitize input length
  IF LENGTH(store_slug_param) > 100 THEN
    RETURN;
  END IF;
  
  -- Return checkout info only for active stores
  RETURN QUERY
  SELECT s.name, s.pix_key, s.whatsapp, s.delivery_fee
  FROM stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug_param))
    AND s.is_active = true;
END;
$$;

-- Create order details function for store owners
CREATE OR REPLACE FUNCTION get_order_details_owner(order_id_param uuid)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  customer_name text,
  customer_phone text,
  address text,
  items jsonb,
  total numeric,
  status text,
  payment_method text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.store_id,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.items,
    o.total,
    o.status,
    o.payment_method,
    o.created_at
  FROM orders o
  JOIN stores s ON s.id = o.store_id
  WHERE o.id = order_id_param
    AND s.owner_id = auth.uid();
END;
$$;