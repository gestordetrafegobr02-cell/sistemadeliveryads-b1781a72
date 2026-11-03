CREATE TABLE IF NOT EXISTS public.internal_function_secrets (
  key text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.internal_function_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.internal_function_secrets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.internal_function_secrets TO service_role;
INSERT INTO public.internal_function_secrets (key, secret)
VALUES ('send-order-push', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_new_order_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_secret text;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYnN6eXN1ZHdtemJ6Z255bXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDAwNTAsImV4cCI6MjEwOTExNjA1MH0.vGEwutUvt7swlRPy3lgYx6PPD_fxT0ER9ikR_mbFB3Q';
BEGIN
  SELECT secret INTO v_secret FROM public.internal_function_secrets WHERE key = 'send-order-push';
  IF v_secret IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://ribszysudwmzbzgnymrz.supabase.co/functions/v1/send-order-push',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon,'x-internal-secret',v_secret),
    body := jsonb_build_object('order_id',NEW.id,'store_id',NEW.store_id,'customer_name',NEW.customer_name,'total',NEW.total)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Order push trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_new_order_push() FROM PUBLIC, anon, authenticated;
