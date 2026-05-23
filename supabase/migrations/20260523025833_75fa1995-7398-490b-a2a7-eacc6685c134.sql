CREATE OR REPLACE FUNCTION public.create_public_order(
  p_order_id uuid,
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_address text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_client_total numeric DEFAULT NULL,
  p_cart_id uuid DEFAULT NULL
)
RETURNS TABLE(order_id uuid, customer_session_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_session_token text;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'order_id is required';
  END IF;

  INSERT INTO public.orders (
    id,
    store_id,
    customer_name,
    customer_phone,
    items,
    total,
    address,
    payment_method
  ) VALUES (
    p_order_id,
    p_store_id,
    p_customer_name,
    p_customer_phone,
    COALESCE(p_items, '[]'::jsonb),
    COALESCE(p_client_total, 0),
    p_address,
    p_payment_method
  )
  RETURNING id, public.orders.customer_session_token
  INTO v_order_id, v_session_token;

  IF p_cart_id IS NOT NULL THEN
    PERFORM public.mark_abandoned_cart_converted(p_cart_id, v_order_id);
  END IF;

  RETURN QUERY SELECT v_order_id, v_session_token;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_insert ON public.orders;
DROP TRIGGER IF EXISTS trg_validar_pedido_inserir ON public.orders;

CREATE TRIGGER trg_validar_pedido_inserir
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_insert();

GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, uuid, text, text, jsonb, text, text, numeric, uuid) TO anon, authenticated;