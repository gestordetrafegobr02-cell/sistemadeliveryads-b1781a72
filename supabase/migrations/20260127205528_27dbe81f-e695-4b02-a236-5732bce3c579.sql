-- Create table for product modifiers/add-ons
CREATE TABLE public.product_modifiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;

-- Modifiers are publicly viewable (needed for client-side selection)
CREATE POLICY "Modifiers are publicly viewable"
ON public.product_modifiers
FOR SELECT
USING (true);

-- Owners can manage modifiers through their products
CREATE POLICY "Owners can manage modifiers"
ON public.product_modifiers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_modifiers.product_id
    AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_modifiers.product_id
    AND s.owner_id = auth.uid()
  )
);

-- Index for performance
CREATE INDEX idx_product_modifiers_product_id ON public.product_modifiers(product_id);

-- Update validate_order_insert to include modifiers in total calculation
CREATE OR REPLACE FUNCTION public.validate_order_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculated_total numeric := 0;
  item jsonb;
  product_price numeric;
  item_quantity int;
  store_delivery_fee numeric := 0;
  modifier jsonb;
  modifier_price numeric;
BEGIN
  -- Force status to 'pending' on insert
  NEW.status := 'pending';
  
  -- Generate session token if not provided (for customer order tracking)
  IF NEW.customer_session_token IS NULL THEN
    NEW.customer_session_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  
  -- Validate store_id exists
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = NEW.store_id) THEN
    RAISE EXCEPTION 'Invalid store_id';
  END IF;
  
  -- Validate customer_name is not empty
  IF NEW.customer_name IS NULL OR TRIM(NEW.customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  
  -- Validate items is a non-empty array
  IF NEW.items IS NULL OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  
  -- Calculate total from actual product prices + modifiers
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT price INTO product_price
    FROM public.products
    WHERE id = (item->>'id')::uuid
      AND store_id = NEW.store_id
      AND is_available = true;
    
    IF product_price IS NULL THEN
      RAISE EXCEPTION 'Invalid or unavailable product in order';
    END IF;
    
    item_quantity := COALESCE((item->>'quantity')::int, 1);
    IF item_quantity <= 0 OR item_quantity > 100 THEN
      RAISE EXCEPTION 'Invalid quantity for product';
    END IF;
    
    -- Add base product price
    calculated_total := calculated_total + (product_price * item_quantity);
    
    -- Add modifiers price if present
    IF item->'modifiers' IS NOT NULL AND jsonb_array_length(item->'modifiers') > 0 THEN
      FOR modifier IN SELECT * FROM jsonb_array_elements(item->'modifiers')
      LOOP
        SELECT pm.price INTO modifier_price
        FROM public.product_modifiers pm
        WHERE pm.id = (modifier->>'id')::uuid
          AND pm.product_id = (item->>'id')::uuid
          AND pm.is_available = true;
        
        IF modifier_price IS NOT NULL THEN
          calculated_total := calculated_total + (modifier_price * item_quantity);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Add delivery fee from store
  SELECT COALESCE(delivery_fee, 0) INTO store_delivery_fee
  FROM public.stores
  WHERE id = NEW.store_id;
  
  calculated_total := calculated_total + store_delivery_fee;
  
  -- Override client-provided total with server-calculated total
  NEW.total := calculated_total;
  
  -- Sanitize and limit field sizes (prevent overflow attacks)
  NEW.customer_name := LEFT(TRIM(NEW.customer_name), 200);
  NEW.customer_phone := LEFT(TRIM(COALESCE(NEW.customer_phone, '')), 50);
  NEW.address := LEFT(TRIM(COALESCE(NEW.address, '')), 500);
  NEW.payment_method := LEFT(TRIM(COALESCE(NEW.payment_method, '')), 50);
  
  -- Clear empty strings to NULL for cleaner data
  IF NEW.customer_phone = '' THEN NEW.customer_phone := NULL; END IF;
  IF NEW.address = '' THEN NEW.address := NULL; END IF;
  IF NEW.payment_method = '' THEN NEW.payment_method := NULL; END IF;
  
  RETURN NEW;
END;
$function$;