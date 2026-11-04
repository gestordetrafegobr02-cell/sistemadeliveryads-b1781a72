-- Secure customer order tracking and make cashback processing token-bound.
-- Existing orders are not rewritten; the token default applies to new orders only.

ALTER TABLE public.orders
  ALTER COLUMN customer_session_token
  SET DEFAULT encode(gen_random_bytes(32), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_session_token_uidx
  ON public.orders (customer_session_token)
  WHERE customer_session_token IS NOT NULL;

-- The ID-only lookup is not present in every deployed schema. Drop it if it exists.
DROP FUNCTION IF EXISTS public.get_order_by_id(uuid);

-- SECURITY DEFINER routines use an empty search_path; referenced objects are schema-qualified.
ALTER FUNCTION public.create_public_order(uuid, uuid, text, text, jsonb, text, text, numeric, uuid)
  SET search_path = '';
ALTER FUNCTION public.get_order_details(uuid, text)
  SET search_path = '';
ALTER FUNCTION public.get_cashback_balance(uuid, text)
  SET search_path = '';
ALTER FUNCTION public.process_order_cashback(uuid, uuid, text, numeric, numeric)
  SET search_path = '';

REVOKE ALL ON FUNCTION public.get_order_details(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_details(uuid, text) TO anon, authenticated, service_role;

-- One earn and one redemption transaction per order. Existing data was checked
-- for duplicate (order_id, type) pairs before creating this index.
CREATE UNIQUE INDEX IF NOT EXISTS cashback_transactions_order_type_uidx
  ON public.cashback_transactions (order_id, type)
  WHERE order_id IS NOT NULL;

-- The browser may request a redemption amount, but cannot choose the customer,
-- store, order total, or earning base. Those values come from the token-verified
-- order row. The order row lock and unique index make retries idempotent.
CREATE OR REPLACE FUNCTION public.process_order_cashback(
  p_order_id uuid,
  p_session_token text,
  p_redeem_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order record;
  v_phone text;
  v_enabled boolean;
  v_pct numeric;
  v_days integer;
  v_earn numeric := 0;
  v_redeem_total numeric := 0;
  v_earn_base numeric := 0;
  v_awarded numeric := 0;
BEGIN
  IF p_order_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RETURN 0;
  END IF;

  SELECT o.id, o.store_id, o.customer_phone, o.total
    INTO v_order
    FROM public.orders AS o
   WHERE o.id = p_order_id
     AND o.customer_session_token = p_session_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Return the prior earning result if this order was already processed.
  IF EXISTS (
    SELECT 1 FROM public.cashback_transactions AS ct
     WHERE ct.order_id = v_order.id
       AND ct.type IN ('earn', 'redeem')
  ) THEN
    SELECT COALESCE(SUM(ct.amount), 0)
      INTO v_awarded
      FROM public.cashback_transactions AS ct
     WHERE ct.order_id = v_order.id
       AND ct.type = 'earn';
    RETURN v_awarded;
  END IF;

  v_phone := regexp_replace(COALESCE(v_order.customer_phone, ''), '\D', '', 'g');
  IF v_phone = '' THEN
    RETURN 0;
  END IF;

  SELECT s.cashback_enabled, s.cashback_percentage, s.cashback_validity_days
    INTO v_enabled, v_pct, v_days
    FROM public.stores AS s
   WHERE s.id = v_order.store_id;

  IF NOT COALESCE(v_enabled, false) THEN
    RETURN 0;
  END IF;

  -- The earning base is the persisted order total, never a client argument.
  v_earn_base := GREATEST(COALESCE(v_order.total, 0), 0);
  IF v_earn_base > 0 AND COALESCE(v_pct, 0) > 0 THEN
    v_awarded := ROUND((v_earn_base * v_pct / 100)::numeric, 2);
    IF v_awarded > 0 THEN
      INSERT INTO public.cashback_transactions (
        store_id, customer_phone, order_id, type, amount, expires_at
      )
      VALUES (
        v_order.store_id,
        v_phone,
        v_order.id,
        'earn',
        v_awarded,
        CASE WHEN v_days > 0 THEN now() + (v_days || ' days')::interval ELSE NULL END
      )
      ON CONFLICT (order_id, type) WHERE order_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;

  RETURN v_awarded;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_order_cashback(uuid, uuid, text, numeric, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_cashback(uuid, text, numeric)
  TO anon, authenticated, service_role;
