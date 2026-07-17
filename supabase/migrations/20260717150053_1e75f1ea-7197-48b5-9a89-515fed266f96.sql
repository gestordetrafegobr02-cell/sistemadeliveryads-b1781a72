
CREATE TABLE public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  function_name text not null,
  store_id uuid null,
  model text null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  success boolean not null default true,
  error_message text null,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai usage"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage_logs;
