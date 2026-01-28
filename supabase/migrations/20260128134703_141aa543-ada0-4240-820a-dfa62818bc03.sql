
-- Update get_personalized_upsell function with simpler logic
CREATE OR REPLACE FUNCTION public.get_personalized_upsell(
  p_store_id uuid, 
  p_cart_product_ids uuid[], 
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  id uuid, 
  name text, 
  price numeric, 
  image_url text, 
  category_name text, 
  custom_message text, 
  is_rule_based boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_upsell_enabled boolean;
  v_blocking_categories uuid[];
  v_exception_products uuid[];
  v_manual_products uuid[];
BEGIN
  -- Check if upsell is enabled and get store settings
  SELECT 
    upsell_enabled, 
    COALESCE(upsell_blocking_categories, '{}'),
    COALESCE(upsell_exception_products, '{}'),
    COALESCE(upsell_products, '{}')
  INTO v_upsell_enabled, v_blocking_categories, v_exception_products, v_manual_products
  FROM stores WHERE id = p_store_id;
  
  IF NOT v_upsell_enabled THEN
    RETURN;
  END IF;
  
  -- Check if cart contains blocking items (category blocked but not in exception list)
  IF EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = ANY(p_cart_product_ids)
      AND p.category_id = ANY(v_blocking_categories)
      AND p.id != ALL(v_exception_products)
  ) THEN
    RETURN;
  END IF;
  
  -- Return combined results using UNION ALL with priority ordering
  RETURN QUERY
  WITH ranked_products AS (
    -- Priority 1: Rule-based upsells
    SELECT 
      p.id,
      p.name,
      p.price,
      p.image_url,
      COALESCE(c.name, 'Geral') as category_name,
      ur.custom_message,
      true as is_rule_based,
      1 as priority,
      ur.sort_order as sub_order
    FROM upsell_rules ur
    JOIN products p ON p.id = ur.offer_product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ur.store_id = p_store_id
      AND ur.is_active = true
      AND ur.trigger_product_id = ANY(p_cart_product_ids)
      AND p.is_available = true
      AND p.id != ALL(p_cart_product_ids)
    
    UNION ALL
    
    -- Priority 2: Manual product selection by store owner
    SELECT 
      p.id,
      p.name,
      p.price,
      p.image_url,
      COALESCE(c.name, 'Geral') as category_name,
      NULL::text as custom_message,
      false as is_rule_based,
      2 as priority,
      array_position(v_manual_products, p.id) as sub_order
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE array_length(v_manual_products, 1) > 0
      AND p.id = ANY(v_manual_products)
      AND p.store_id = p_store_id
      AND p.is_available = true
      AND p.id != ALL(p_cart_product_ids)
    
    UNION ALL
    
    -- Priority 3: Category-based fallback
    SELECT 
      p.id,
      p.name,
      p.price,
      p.image_url,
      COALESCE(c.name, 'Geral') as category_name,
      NULL::text as custom_message,
      false as is_rule_based,
      3 as priority,
      0 as sub_order
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.store_id = p_store_id
      AND p.is_available = true
      AND p.id != ALL(p_cart_product_ids)
      AND LOWER(c.name) IN (
        'bebidas', 'bebida', 
        'sucos', 'suco', 
        'refrigerantes', 'refrigerante', 
        'sobremesas', 'sobremesa', 
        'drinks', 'desserts',
        'acompanhamentos', 'acompanhamento',
        'sides', 'extras'
      )
  )
  SELECT DISTINCT ON (rp.id)
    rp.id,
    rp.name,
    rp.price,
    rp.image_url,
    rp.category_name,
    rp.custom_message,
    rp.is_rule_based
  FROM ranked_products rp
  ORDER BY rp.id, rp.priority, rp.sub_order
  LIMIT p_limit;
END;
$function$;
