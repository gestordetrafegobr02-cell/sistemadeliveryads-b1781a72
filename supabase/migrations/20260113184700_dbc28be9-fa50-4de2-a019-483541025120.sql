-- 1. SECURE RPC FUNCTIONS
-- Replace get_store_checkout_data with validated version
DROP FUNCTION IF EXISTS public.get_store_checkout_data(uuid);

CREATE OR REPLACE FUNCTION public.get_store_checkout_data(store_id uuid)
RETURNS TABLE(whatsapp text, pix_key text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate store_id exists and is not null
  IF store_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Only return data if store exists (prevents enumeration)
  IF NOT EXISTS (SELECT 1 FROM public.stores_public sp WHERE sp.id = store_id) THEN
    RETURN;
  END IF;
  
  -- Return checkout data for valid store
  RETURN QUERY
  SELECT s.whatsapp, s.pix_key
  FROM public.stores s
  WHERE s.id = store_id;
END;
$$;

-- Replace get_store_pixel with validated version
DROP FUNCTION IF EXISTS public.get_store_pixel(uuid);

CREATE OR REPLACE FUNCTION public.get_store_pixel(store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  pixel_id text;
BEGIN
  -- Validate store_id
  IF store_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Only return if store exists
  IF NOT EXISTS (SELECT 1 FROM public.stores_public sp WHERE sp.id = store_id) THEN
    RETURN NULL;
  END IF;
  
  SELECT s.facebook_pixel_id INTO pixel_id
  FROM public.stores s
  WHERE s.id = store_id;
  
  RETURN pixel_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_store_checkout_data(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_pixel(uuid) TO anon, authenticated;

-- 2. ORDER VALIDATION FUNCTION AND TRIGGER
-- Create function to validate and calculate order total server-side
CREATE OR REPLACE FUNCTION public.validate_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_total numeric := 0;
  item jsonb;
  product_price numeric;
  item_quantity int;
  store_delivery_fee numeric := 0;
BEGIN
  -- Force status to 'pending' on insert (prevent manipulation)
  NEW.status := 'pending';
  
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
  
  -- Calculate total from actual product prices
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Get product price from database
    SELECT price INTO product_price
    FROM public.products
    WHERE id = (item->>'id')::uuid
      AND store_id = NEW.store_id
      AND is_available = true;
    
    IF product_price IS NULL THEN
      RAISE EXCEPTION 'Invalid or unavailable product in order';
    END IF;
    
    -- Get quantity (default to 1)
    item_quantity := COALESCE((item->>'quantity')::int, 1);
    IF item_quantity <= 0 OR item_quantity > 100 THEN
      RAISE EXCEPTION 'Invalid quantity for product';
    END IF;
    
    calculated_total := calculated_total + (product_price * item_quantity);
  END LOOP;
  
  -- Add delivery fee from store
  SELECT COALESCE(delivery_fee, 0) INTO store_delivery_fee
  FROM public.stores
  WHERE id = NEW.store_id;
  
  calculated_total := calculated_total + store_delivery_fee;
  
  -- Override client-provided total with server-calculated total
  NEW.total := calculated_total;
  
  -- Limit field sizes to prevent overflow attacks
  NEW.customer_name := LEFT(NEW.customer_name, 200);
  NEW.customer_phone := LEFT(NEW.customer_phone, 50);
  NEW.address := LEFT(NEW.address, 500);
  NEW.payment_method := LEFT(NEW.payment_method, 50);
  
  RETURN NEW;
END;
$$;

-- Create trigger for order validation
DROP TRIGGER IF EXISTS validate_order_before_insert ON public.orders;
CREATE TRIGGER validate_order_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_insert();

-- 3. ENSURE STORES TABLE IS PROPERLY LOCKED DOWN
-- The current policies are correct, but let's make sure there's no public SELECT path
-- Drop any conflicting policies first
DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;

-- Verify the blocking policy exists (recreate if needed)
DROP POLICY IF EXISTS "No direct public access to stores" ON public.stores;
CREATE POLICY "No direct public access to stores"
ON public.stores
FOR SELECT
TO anon
USING (false);

-- Ensure authenticated users can only see their own stores
DROP POLICY IF EXISTS "Authenticated users see own stores only" ON public.stores;
CREATE POLICY "Authenticated users see own stores only"
ON public.stores
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);