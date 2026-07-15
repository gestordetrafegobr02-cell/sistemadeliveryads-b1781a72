
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subs_store ON public.push_subscriptions(store_id);

GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own subs" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own subs" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.has_store_access(store_id, auth.uid()));
CREATE POLICY "users delete own subs" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Trigger: on new order, call edge function to send push
CREATE OR REPLACE FUNCTION public.notify_new_order_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://rxmjjuhibcvqzidgidxp.supabase.co/functions/v1/send-order-push';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bWpqdWhpYmN2cXppZGdpZHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjYyMDcsImV4cCI6MjA4Mzc0MjIwN30.ihhQErUvcR8lchI_t4Zdm81Zs5k6PbP8H9bOQm9rZ3Y';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
    body := jsonb_build_object('order_id', NEW.id, 'store_id', NEW.store_id, 'customer_name', NEW.customer_name, 'total', NEW.total)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_order_push
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order_push();
