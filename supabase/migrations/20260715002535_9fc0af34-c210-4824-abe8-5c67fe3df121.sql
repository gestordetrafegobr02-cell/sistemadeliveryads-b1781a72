
-- PDV: mesas + comandas + itens

CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  number int NOT NULL,
  label text,
  seats int NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied','reserved')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tables TO authenticated;
GRANT ALL ON public.tables TO service_role;

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read tables" ON public.tables FOR SELECT TO authenticated
USING (public.has_store_access(store_id, auth.uid()));

CREATE POLICY "owner manage tables" ON public.tables FOR ALL TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]))
WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

CREATE POLICY "team update table status" ON public.tables FOR UPDATE TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[]))
WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[]));

CREATE TRIGGER tables_updated_at BEFORE UPDATE ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comandas
CREATE TABLE public.pdv_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL,
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','canceled')),
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pdv_sessions_store_status_idx ON public.pdv_sessions(store_id, status);
CREATE INDEX pdv_sessions_table_open_idx ON public.pdv_sessions(table_id) WHERE status = 'open';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_sessions TO authenticated;
GRANT ALL ON public.pdv_sessions TO service_role;

ALTER TABLE public.pdv_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read sessions" ON public.pdv_sessions FOR SELECT TO authenticated
USING (public.has_store_access(store_id, auth.uid()));

CREATE POLICY "operator manage sessions" ON public.pdv_sessions FOR ALL TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[]))
WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[]));

CREATE TRIGGER pdv_sessions_updated_at BEFORE UPDATE ON public.pdv_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens da comanda
CREATE TABLE public.pdv_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.pdv_sessions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  modifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  sent_to_kitchen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pdv_session_items_session_idx ON public.pdv_session_items(session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_session_items TO authenticated;
GRANT ALL ON public.pdv_session_items TO service_role;

ALTER TABLE public.pdv_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read items" ON public.pdv_session_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pdv_sessions s
  WHERE s.id = session_id AND public.has_store_access(s.store_id, auth.uid())
));

CREATE POLICY "operator manage items" ON public.pdv_session_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pdv_sessions s
  WHERE s.id = session_id
    AND public.has_store_role(s.store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pdv_sessions s
  WHERE s.id = session_id
    AND public.has_store_role(s.store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[])
));

-- Recalcula subtotal/total ao inserir/atualizar/apagar itens
CREATE OR REPLACE FUNCTION public.recalc_pdv_session_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session_id uuid;
  v_subtotal numeric;
  v_discount numeric;
BEGIN
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_subtotal
  FROM public.pdv_session_items WHERE session_id = v_session_id;
  SELECT COALESCE(discount, 0) INTO v_discount FROM public.pdv_sessions WHERE id = v_session_id;
  UPDATE public.pdv_sessions
    SET subtotal = v_subtotal,
        total = GREATEST(v_subtotal - COALESCE(v_discount,0), 0),
        updated_at = now()
    WHERE id = v_session_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER pdv_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.pdv_session_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_pdv_session_totals();

-- Abre comanda (mesa ou balcão)
CREATE OR REPLACE FUNCTION public.open_pdv_session(
  p_store_id uuid,
  p_table_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_store_role(p_store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[]) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_table_id IS NOT NULL THEN
    -- Reaproveita comanda aberta se já houver
    SELECT id INTO v_id FROM public.pdv_sessions
      WHERE table_id = p_table_id AND status = 'open' LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO public.pdv_sessions (store_id, table_id, opened_by, customer_name, customer_phone)
  VALUES (p_store_id, p_table_id, auth.uid(), NULLIF(TRIM(COALESCE(p_customer_name,'')),''), NULLIF(TRIM(COALESCE(p_customer_phone,'')),''))
  RETURNING id INTO v_id;

  IF p_table_id IS NOT NULL THEN
    UPDATE public.tables SET status = 'occupied', updated_at = now() WHERE id = p_table_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Fecha comanda + aplica cashback + libera mesa
CREATE OR REPLACE FUNCTION public.close_pdv_session(
  p_session_id uuid,
  p_payment_method text,
  p_redeem_cashback numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session public.pdv_sessions;
  v_awarded numeric := 0;
  v_final numeric;
  v_redeem numeric := GREATEST(COALESCE(p_redeem_cashback, 0), 0);
BEGIN
  SELECT * INTO v_session FROM public.pdv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_session.status <> 'open' THEN RAISE EXCEPTION 'session_not_open'; END IF;
  IF NOT public.has_store_role(v_session.store_id, auth.uid(), ARRAY['owner','manager','attendant']::public.store_role[]) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_redeem > v_session.subtotal THEN v_redeem := v_session.subtotal; END IF;
  v_final := GREATEST(v_session.subtotal - v_redeem, 0);

  UPDATE public.pdv_sessions
    SET status = 'closed',
        payment_method = NULLIF(TRIM(p_payment_method), ''),
        discount = v_redeem,
        total = v_final,
        closed_at = now(),
        updated_at = now()
    WHERE id = p_session_id;

  IF v_session.table_id IS NOT NULL THEN
    UPDATE public.tables SET status = 'free', updated_at = now() WHERE id = v_session.table_id;
  END IF;

  IF v_session.customer_phone IS NOT NULL THEN
    v_awarded := public.process_order_cashback(
      v_session.store_id, NULL, v_session.customer_phone, v_redeem, v_final
    );
  END IF;

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'total', v_final,
    'redeemed', v_redeem,
    'cashback_awarded', v_awarded
  );
END;
$$;

-- Cancela comanda
CREATE OR REPLACE FUNCTION public.cancel_pdv_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_store uuid; v_table uuid; v_status text;
BEGIN
  SELECT store_id, table_id, status INTO v_store, v_table, v_status
    FROM public.pdv_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_status <> 'open' THEN RETURN; END IF;
  IF NOT public.has_store_role(v_store, auth.uid(), ARRAY['owner','manager']::public.store_role[]) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.pdv_sessions SET status = 'canceled', closed_at = now(), updated_at = now()
    WHERE id = p_session_id;
  IF v_table IS NOT NULL THEN
    UPDATE public.tables SET status = 'free', updated_at = now() WHERE id = v_table;
  END IF;
END; $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pdv_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pdv_session_items;
