-- Create upsell_rules table for product-specific offers
CREATE TABLE public.upsell_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trigger_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  offer_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  custom_message text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, trigger_product_id, offer_product_id)
);

-- Add column for product-level blocking exceptions (products that DON'T block upsell even if in blocking category)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS upsell_exception_products uuid[] DEFAULT '{}';

-- Add column for default upsell message
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS upsell_default_message text DEFAULT 'Que tal adicionar isso ao seu pedido?';

-- Enable RLS on upsell_rules
ALTER TABLE public.upsell_rules ENABLE ROW LEVEL SECURITY;

-- RLS: Public can view active rules for menu display
CREATE POLICY "Upsell rules are publicly viewable"
ON public.upsell_rules
FOR SELECT
USING (is_active = true);

-- RLS: Store owners can manage their upsell rules
CREATE POLICY "Owners can manage upsell rules"
ON public.upsell_rules
FOR ALL
USING (EXISTS (
  SELECT 1 FROM stores WHERE stores.id = upsell_rules.store_id AND stores.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM stores WHERE stores.id = upsell_rules.store_id AND stores.owner_id = auth.uid()
));

-- Create function to get personalized upsell products
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
AS $$
DECLARE
  v_upsell_enabled boolean;
  v_blocking_categories uuid[];
  v_exception_products uuid[];
BEGIN
  -- Check if upsell is enabled
  SELECT 
    upsell_enabled, 
    COALESCE(upsell_blocking_categories, '{}'),
    COALESCE(upsell_exception_products, '{}')
  INTO v_upsell_enabled, v_blocking_categories, v_exception_products
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
  
  -- First, get rule-based upsells (personalized offers)
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.price,
    p.image_url,
    c.name as category_name,
    ur.custom_message,
    true as is_rule_based
  FROM upsell_rules ur
  JOIN products p ON p.id = ur.offer_product_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE ur.store_id = p_store_id
    AND ur.is_active = true
    AND ur.trigger_product_id = ANY(p_cart_product_ids)
    AND p.is_available = true
    AND p.id != ALL(p_cart_product_ids)
  ORDER BY ur.sort_order
  LIMIT p_limit;
  
  -- If no rule-based results, fall back to category-based suggestions
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.price,
      p.image_url,
      c.name as category_name,
      NULL::text as custom_message,
      false as is_rule_based
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.store_id = p_store_id
      AND p.is_available = true
      AND p.id != ALL(p_cart_product_ids)
      AND LOWER(c.name) IN ('bebidas', 'bebida', 'sucos', 'suco', 'refrigerantes', 'refrigerante', 'sobremesas', 'sobremesa', 'drinks', 'desserts')
    ORDER BY RANDOM()
    LIMIT p_limit;
  END IF;
END;
$$;

-- Add comments
COMMENT ON TABLE public.upsell_rules IS 'Product-specific upsell rules: when trigger product is in cart, offer specific product';
COMMENT ON COLUMN public.stores.upsell_exception_products IS 'Products that do NOT block upsell even if their category is in blocking list';
COMMENT ON COLUMN public.stores.upsell_default_message IS 'Default message shown in upsell modal when no custom message is set';