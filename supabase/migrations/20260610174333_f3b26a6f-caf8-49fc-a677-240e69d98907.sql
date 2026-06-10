CREATE TABLE IF NOT EXISTS public.pending_orders (
  id uuid PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_payment',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.pending_orders TO service_role;

ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_orders_deny_anon_select" ON public.pending_orders FOR SELECT TO anon USING (false);
CREATE POLICY "pending_orders_deny_anon_all" ON public.pending_orders FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "pending_orders_deny_auth_select" ON public.pending_orders FOR SELECT TO authenticated USING (false);
CREATE POLICY "pending_orders_deny_auth_all" ON public.pending_orders FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS pending_orders_store_id_idx ON public.pending_orders(store_id);
CREATE INDEX IF NOT EXISTS pending_orders_created_at_idx ON public.pending_orders(created_at);