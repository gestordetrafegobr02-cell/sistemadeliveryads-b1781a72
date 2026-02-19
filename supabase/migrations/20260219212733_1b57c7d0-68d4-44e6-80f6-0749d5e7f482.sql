
-- Step 1: Drop the permissive anonymous update policy
DROP POLICY IF EXISTS "Anyone can update their abandoned carts" ON public.abandoned_carts;

-- Step 2: Create a secure RPC for anonymous cart updates (validates by cart ID returned on insert)
CREATE OR REPLACE FUNCTION public.upsert_abandoned_cart(
  p_cart_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_total numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id uuid;
BEGIN
  -- Validate required fields
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;

  -- Sanitize inputs
  p_customer_name := LEFT(TRIM(COALESCE(p_customer_name, '')), 200);
  p_customer_phone := LEFT(TRIM(COALESCE(p_customer_phone, '')), 50);
  IF p_customer_name = '' THEN p_customer_name := NULL; END IF;
  IF p_customer_phone = '' THEN p_customer_phone := NULL; END IF;

  -- Must have at least name or phone
  IF p_customer_name IS NULL AND p_customer_phone IS NULL THEN
    RAISE EXCEPTION 'customer_name or customer_phone is required';
  END IF;

  -- Validate store exists
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid store';
  END IF;

  IF p_cart_id IS NOT NULL THEN
    -- UPDATE existing cart (only if not recovered/converted)
    UPDATE abandoned_carts
    SET customer_name = COALESCE(p_customer_name, customer_name),
        customer_phone = COALESCE(p_customer_phone, customer_phone),
        items = p_items,
        total = p_total
    WHERE id = p_cart_id
      AND store_id = p_store_id
      AND recovered_at IS NULL
      AND converted_to_order_id IS NULL
    RETURNING id INTO v_cart_id;

    IF v_cart_id IS NULL THEN
      RAISE EXCEPTION 'Cart not found or already recovered';
    END IF;
  ELSE
    -- INSERT new cart
    INSERT INTO abandoned_carts (store_id, customer_name, customer_phone, items, total)
    VALUES (p_store_id, p_customer_name, p_customer_phone, p_items, p_total)
    RETURNING id INTO v_cart_id;
  END IF;

  RETURN v_cart_id;
END;
$$;

-- Step 3: Create RPC to mark cart as converted (used on checkout)
CREATE OR REPLACE FUNCTION public.mark_abandoned_cart_converted(
  p_cart_id uuid,
  p_order_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE abandoned_carts
  SET recovered_at = now(),
      converted_to_order_id = p_order_id
  WHERE id = p_cart_id
    AND recovered_at IS NULL
    AND converted_to_order_id IS NULL;
END;
$$;
