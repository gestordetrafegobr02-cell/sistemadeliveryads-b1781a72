
-- ============ PRINTING + CASHBACK ============

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS auto_print boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cashback_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cashback_percentage numeric(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cashback_validity_days integer NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS public.cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  order_id uuid,
  type text NOT NULL CHECK (type IN ('earn','redeem')),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashback_lookup
  ON public.cashback_transactions (store_id, customer_phone);

GRANT SELECT ON public.cashback_transactions TO authenticated;
GRANT ALL ON public.cashback_transactions TO service_role;

ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their cashback ledger"
ON public.cashback_transactions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = cashback_transactions.store_id AND s.owner_id = auth.uid()
));

-- ===== Public RPC: get balance by phone =====
CREATE OR REPLACE FUNCTION public.get_cashback_balance(p_store_id uuid, p_customer_phone text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(COALESCE(p_customer_phone,''), '\D', '', 'g');
  v_earn numeric := 0;
  v_redeem numeric := 0;
BEGIN
  IF v_phone = '' OR p_store_id IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_earn
  FROM public.cashback_transactions
  WHERE store_id = p_store_id
    AND customer_phone = v_phone
    AND type = 'earn'
    AND (expires_at IS NULL OR expires_at > now());

  SELECT COALESCE(SUM(amount),0) INTO v_redeem
  FROM public.cashback_transactions
  WHERE store_id = p_store_id
    AND customer_phone = v_phone
    AND type = 'redeem';

  RETURN GREATEST(v_earn - v_redeem, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cashback_balance(uuid, text) TO anon, authenticated;

-- ===== Public RPC: get cashback config for a store (safe subset) =====
CREATE OR REPLACE FUNCTION public.get_store_cashback_config(p_store_id uuid)
RETURNS TABLE(enabled boolean, percentage numeric, validity_days integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.cashback_enabled, s.cashback_percentage, s.cashback_validity_days
  FROM public.stores s
  WHERE s.id = p_store_id AND s.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_cashback_config(uuid) TO anon, authenticated;

-- ===== Public RPC: register redeem + earn atomically after order =====
CREATE OR REPLACE FUNCTION public.process_order_cashback(
  p_store_id uuid,
  p_order_id uuid,
  p_customer_phone text,
  p_redeem_amount numeric,
  p_earn_base numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(COALESCE(p_customer_phone,''), '\D', '', 'g');
  v_enabled boolean;
  v_pct numeric;
  v_days integer;
  v_balance numeric;
  v_awarded numeric := 0;
  v_redeem numeric := GREATEST(COALESCE(p_redeem_amount,0), 0);
BEGIN
  IF v_phone = '' OR p_store_id IS NULL THEN RETURN 0; END IF;

  SELECT cashback_enabled, cashback_percentage, cashback_validity_days
    INTO v_enabled, v_pct, v_days
  FROM public.stores WHERE id = p_store_id;

  IF NOT COALESCE(v_enabled, false) THEN RETURN 0; END IF;

  -- Redeem (guard against over-spend)
  IF v_redeem > 0 THEN
    v_balance := public.get_cashback_balance(p_store_id, v_phone);
    IF v_redeem > v_balance THEN v_redeem := v_balance; END IF;
    IF v_redeem > 0 THEN
      INSERT INTO public.cashback_transactions(store_id, customer_phone, order_id, type, amount)
      VALUES (p_store_id, v_phone, p_order_id, 'redeem', v_redeem);
    END IF;
  END IF;

  -- Earn
  IF COALESCE(p_earn_base,0) > 0 AND COALESCE(v_pct,0) > 0 THEN
    v_awarded := ROUND((p_earn_base * v_pct / 100)::numeric, 2);
    IF v_awarded > 0 THEN
      INSERT INTO public.cashback_transactions(store_id, customer_phone, order_id, type, amount, expires_at)
      VALUES (
        p_store_id, v_phone, p_order_id, 'earn', v_awarded,
        CASE WHEN v_days > 0 THEN now() + (v_days || ' days')::interval ELSE NULL END
      );
    END IF;
  END IF;

  RETURN v_awarded;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_order_cashback(uuid, uuid, text, numeric, numeric) TO anon, authenticated;
