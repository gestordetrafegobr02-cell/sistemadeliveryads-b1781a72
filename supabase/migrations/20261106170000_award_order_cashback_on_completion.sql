-- Guest-order cashback is credited only after the store marks the order completed.
-- The browser cannot invoke the privileged ledger function directly.

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
  v_earn_base numeric := 0;
  v_awarded numeric := 0;
BEGIN
  IF p_order_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RETURN 0;
  END IF;

  SELECT o.id, o.store_id, o.customer_phone, o.total, o.status
    INTO v_order
    FROM public.orders AS o
   WHERE o.id = p_order_id
     AND o.customer_session_token = p_session_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Cashback is not earned for pending, preparing, cancelled, or in-transit orders.
  IF lower(trim(coalesce(v_order.status, ''))) NOT IN ('completed', 'concluido', 'entregue') THEN
    RETURN 0;
  END IF;

  -- Return the prior earning result if this order was already processed.
  IF EXISTS (
    SELECT 1 FROM public.cashback_transactions AS ct
     WHERE ct.order_id = v_order.id
       AND ct.type = 'earn'
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

-- This routine is now trigger-only; do not expose it as a public RPC.
REVOKE ALL ON FUNCTION public.process_order_cashback(uuid, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_cashback(uuid, text, numeric)
  TO service_role;

CREATE OR REPLACE FUNCTION public.award_order_cashback_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND lower(trim(coalesce(NEW.status, ''))) IN ('completed', 'concluido', 'entregue') THEN
    PERFORM public.process_order_cashback(
      NEW.id,
      NEW.customer_session_token,
      0
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.award_order_cashback_on_completion()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_award_order_cashback_on_completion ON public.orders;
CREATE TRIGGER trg_award_order_cashback_on_completion
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.award_order_cashback_on_completion();
