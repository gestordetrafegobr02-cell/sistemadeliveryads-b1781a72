
DROP FUNCTION IF EXISTS public.get_public_store_by_slug(text);

CREATE FUNCTION public.get_public_store_by_slug(store_slug text)
 RETURNS TABLE(id uuid, name text, logo_url text, cover_url text, delivery_fee numeric, opening_hours jsonb, is_open_manual boolean, is_active boolean, is_trial_expired boolean, created_at timestamp with time zone, updated_at timestamp with time zone, primary_color text, store_template_style text, bg_color text, card_style text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    s.id, s.name, s.logo_url, s.cover_url, s.delivery_fee,
    s.opening_hours, s.is_open_manual, s.is_active,
    CASE WHEN s.trial_expires_at IS NOT NULL AND s.trial_expires_at < NOW() THEN TRUE ELSE FALSE END,
    s.created_at, s.updated_at, s.primary_color, s.store_template_style, s.bg_color, s.card_style
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug))
    AND s.is_active = TRUE;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_store_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_payment_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_pixel_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_checkout_info(text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_store_stats(uuid);

CREATE FUNCTION public.get_store_stats(
  p_store_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  daily_revenue jsonb;
  top_neighborhoods jsonb;
  top_products jsonb;
  total_revenue numeric;
  total_orders int;
  avg_ticket numeric;
  v_start timestamp with time zone;
  v_end timestamp with time zone;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_start := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '6 days')::timestamp with time zone);
  v_end   := COALESCE(p_end_date, (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone);

  SELECT COALESCE(jsonb_agg(d ORDER BY day), '[]'::jsonb) INTO daily_revenue FROM (
    SELECT DATE(created_at) as day, SUM(total) as revenue, COUNT(*) as order_count
    FROM orders
    WHERE store_id = p_store_id
      AND created_at >= v_start AND created_at < v_end
      AND COALESCE(status,'pending') NOT IN ('cancelado','cancelled','canceled')
    GROUP BY DATE(created_at)
  ) d;

  SELECT COALESCE(jsonb_agg(n ORDER BY order_count DESC), '[]'::jsonb) INTO top_neighborhoods FROM (
    SELECT COALESCE(NULLIF(TRIM(SPLIT_PART(address, ',', 2)), ''), 'Retirada/Não informado') as neighborhood,
           COUNT(*) as order_count
    FROM orders
    WHERE store_id = p_store_id
      AND created_at >= v_start AND created_at < v_end
      AND COALESCE(status,'pending') NOT IN ('cancelado','cancelled','canceled')
    GROUP BY 1 ORDER BY order_count DESC LIMIT 5
  ) n;

  SELECT COALESCE(jsonb_agg(p ORDER BY total_quantity DESC), '[]'::jsonb) INTO top_products FROM (
    SELECT item->>'name' as product_name, SUM((item->>'quantity')::int) as total_quantity
    FROM orders, LATERAL jsonb_array_elements(items) as item
    WHERE store_id = p_store_id
      AND created_at >= v_start AND created_at < v_end
      AND COALESCE(status,'pending') NOT IN ('cancelado','cancelled','canceled')
    GROUP BY item->>'name' ORDER BY total_quantity DESC LIMIT 5
  ) p;

  SELECT COALESCE(SUM(total), 0), COUNT(*) INTO total_revenue, total_orders
  FROM orders
  WHERE store_id = p_store_id
    AND created_at >= v_start AND created_at < v_end
    AND COALESCE(status,'pending') NOT IN ('cancelado','cancelled','canceled');

  avg_ticket := CASE WHEN total_orders > 0 THEN total_revenue / total_orders ELSE 0 END;

  result := jsonb_build_object(
    'daily_revenue', daily_revenue,
    'top_neighborhoods', top_neighborhoods,
    'top_products', top_products,
    'total_revenue', total_revenue,
    'total_orders', total_orders,
    'avg_ticket', ROUND(avg_ticket, 2),
    'start_date', v_start,
    'end_date', v_end
  );
  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_store_stats(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;
