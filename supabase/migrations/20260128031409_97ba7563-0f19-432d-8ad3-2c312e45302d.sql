-- Create RPC function for store statistics (revenue, top neighborhoods, top products)
CREATE OR REPLACE FUNCTION public.get_store_stats(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  daily_revenue jsonb;
  top_neighborhoods jsonb;
  top_products jsonb;
  total_revenue numeric;
  total_orders int;
  avg_ticket numeric;
BEGIN
  -- Only allow store owner or admin
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = p_store_id AND owner_id = auth.uid()
  ) AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Daily revenue for last 7 days (excluding canceled orders)
  SELECT COALESCE(jsonb_agg(day_data ORDER BY day), '[]'::jsonb)
  INTO daily_revenue
  FROM (
    SELECT 
      DATE(created_at) as day,
      SUM(total) as revenue,
      COUNT(*) as order_count
    FROM orders
    WHERE store_id = p_store_id
      AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      AND COALESCE(status, 'pending') NOT IN ('cancelado', 'cancelled', 'canceled')
    GROUP BY DATE(created_at)
  ) day_data;

  -- Top 5 neighborhoods by order volume
  SELECT COALESCE(jsonb_agg(neighborhood_data ORDER BY order_count DESC), '[]'::jsonb)
  INTO top_neighborhoods
  FROM (
    SELECT 
      COALESCE(
        NULLIF(TRIM(SPLIT_PART(address, ',', 2)), ''),
        'Retirada/Não informado'
      ) as neighborhood,
      COUNT(*) as order_count
    FROM orders
    WHERE store_id = p_store_id
      AND COALESCE(status, 'pending') NOT IN ('cancelado', 'cancelled', 'canceled')
    GROUP BY COALESCE(
      NULLIF(TRIM(SPLIT_PART(address, ',', 2)), ''),
      'Retirada/Não informado'
    )
    ORDER BY order_count DESC
    LIMIT 5
  ) neighborhood_data;

  -- Top 5 products by quantity sold
  SELECT COALESCE(jsonb_agg(product_data ORDER BY total_quantity DESC), '[]'::jsonb)
  INTO top_products
  FROM (
    SELECT 
      item->>'name' as product_name,
      SUM((item->>'quantity')::int) as total_quantity
    FROM orders,
    LATERAL jsonb_array_elements(items) as item
    WHERE store_id = p_store_id
      AND COALESCE(status, 'pending') NOT IN ('cancelado', 'cancelled', 'canceled')
    GROUP BY item->>'name'
    ORDER BY total_quantity DESC
    LIMIT 5
  ) product_data;

  -- Total revenue and orders (excluding canceled)
  SELECT 
    COALESCE(SUM(total), 0),
    COUNT(*)
  INTO total_revenue, total_orders
  FROM orders
  WHERE store_id = p_store_id
    AND COALESCE(status, 'pending') NOT IN ('cancelado', 'cancelled', 'canceled');

  -- Calculate average ticket
  IF total_orders > 0 THEN
    avg_ticket := total_revenue / total_orders;
  ELSE
    avg_ticket := 0;
  END IF;

  -- Build result JSON
  result := jsonb_build_object(
    'daily_revenue', daily_revenue,
    'top_neighborhoods', top_neighborhoods,
    'top_products', top_products,
    'total_revenue', total_revenue,
    'total_orders', total_orders,
    'avg_ticket', ROUND(avg_ticket, 2)
  );

  RETURN result;
END;
$$;

-- Create function to get upsell products (random items from drink/dessert categories)
CREATE OR REPLACE FUNCTION public.get_upsell_products(p_store_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(
  id uuid,
  name text,
  price numeric,
  image_url text,
  category_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.price,
    p.image_url,
    c.name as category_name
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.store_id = p_store_id
    AND p.is_available = true
    AND LOWER(c.name) IN ('bebidas', 'bebida', 'sucos', 'suco', 'refrigerantes', 'refrigerante', 'sobremesas', 'sobremesa', 'drinks', 'desserts')
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$;