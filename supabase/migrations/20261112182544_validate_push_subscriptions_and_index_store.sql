ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_https_length_check
  CHECK (endpoint ~ '^https://[^/]+/.+' AND length(endpoint) <= 2048);

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_keys_format_check
  CHECK (
    p256dh ~ '^[A-Za-z0-9_-]{80,128}$'
    AND auth ~ '^[A-Za-z0-9_-]{16,64}$'
  );

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_store_id
  ON public.push_subscriptions (store_id);
