-- Restrict public storefront configuration and upsell data to active stores.
-- This migration was already applied to the new Supabase project; this file
-- restores the matching source history so future environments can reproduce it.

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
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_upsell_enabled boolean;
  v_blocking_categories uuid[];
  v_exception_products uuid[];
  v_manual_products uuid[];
BEGIN
  SELECT
    s.upsell_enabled,
    COALESCE(s.upsell_blocking_categories, '{}'),
    COALESCE(s.upsell_exception_products, '{}'),
    COALESCE(s.upsell_products, '{}')
  INTO v_upsell_enabled, v_blocking_categories, v_exception_products, v_manual_products
  FROM public.stores s
  WHERE s.id = p_store_id
    AND s.is_active = true;

  IF v_upsell_enabled IS NOT TRUE THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.products prod
    WHERE prod.id = ANY(p_cart_product_ids)
      AND prod.category_id = ANY(v_blocking_categories)
      AND prod.id != ALL(v_exception_products)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked_products AS (
    SELECT p.id AS pid, p.name AS pname, p.price AS pprice,
      p.image_url AS pimage, COALESCE(c.name, 'Geral') AS catname,
      ur.custom_message AS cmsg, true AS is_rule, 1 AS priority,
      ur.sort_order AS sub_order
    FROM public.upsell_rules ur
    JOIN public.products p ON p.id = ur.offer_product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE ur.store_id = p_store_id
      AND ur.is_active = true
      AND ur.trigger_product_id = ANY(p_cart_product_ids)
      AND p.is_available = true
      AND p.id != ALL(p_cart_product_ids)

    UNION ALL

    SELECT p.id, p.name, p.price, p.image_url,
      COALESCE(c.name, 'Geral'), NULL::text, false, 2,
      array_position(v_manual_products, p.id)
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE array_length(v_manual_products, 1) > 0
      AND p.id = ANY(v_manual_products)
      AND p.store_id = p_store_id
      AND p.is_available = true
      AND p.id != ALL(p_cart_product_ids)

    UNION ALL

    SELECT p.id, p.name, p.price, p.image_url,
      COALESCE(c.name, 'Geral'), NULL::text, false, 3, 0
    FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    WHERE p.store_id = p_store_id
      AND p.is_available = true
      AND p.id != ALL(p_cart_product_ids)
      AND LOWER(c.name) IN (
        'bebidas', 'bebida', 'sucos', 'suco', 'refrigerantes',
        'refrigerante', 'sobremesas', 'sobremesa', 'drinks', 'desserts',
        'acompanhamentos', 'acompanhamento', 'sides', 'extras'
      )
  )
  SELECT DISTINCT ON (rp.pid)
    rp.pid, rp.pname, rp.pprice, rp.pimage,
    rp.catname, rp.cmsg, rp.is_rule
  FROM ranked_products rp
  ORDER BY rp.pid, rp.priority, rp.sub_order
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 1), 10);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_upsell_products(
  p_store_id uuid,
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  id uuid,
  name text,
  price numeric,
  image_url text,
  category_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.price, p.image_url, c.name AS category_name
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  JOIN public.stores s ON s.id = p.store_id AND s.is_active = true
  WHERE p.store_id = p_store_id
    AND p.is_available = true
    AND LOWER(c.name) IN (
      'bebidas', 'bebida', 'sucos', 'suco', 'refrigerantes',
      'refrigerante', 'sobremesas', 'sobremesa', 'drinks', 'desserts'
    )
  ORDER BY RANDOM()
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 1), 10);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_store_payment_data(store_slug text)
RETURNS TABLE(pix_key text, whatsapp text, store_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF store_slug IS NULL OR TRIM(store_slug) = '' OR LENGTH(store_slug) > 100 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.pix_key, s.whatsapp, s.name
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug))
    AND s.is_active = true
    AND s.is_open_manual IS NOT FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_store_pixel_by_slug(store_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pixel_id text;
BEGIN
  IF store_slug IS NULL OR TRIM(store_slug) = '' OR LENGTH(store_slug) > 100 THEN
    RETURN NULL;
  END IF;

  SELECT s.facebook_pixel_id INTO pixel_id
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug))
    AND s.is_active = true;

  RETURN pixel_id;
END;
$function$;
