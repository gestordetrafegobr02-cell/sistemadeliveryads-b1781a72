-- 1. Update is_master_admin() to read from global_settings instead of hardcoded email
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()) = 
    (SELECT value FROM public.global_settings WHERE key = 'master_admin_email'),
    false
  )
$$;

-- 2. Replace open global_settings SELECT policy with whitelist
DROP POLICY IF EXISTS "Anyone can read global settings" ON public.global_settings;

CREATE POLICY "Public can read whitelisted settings"
  ON public.global_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('subscription_price', 'default_trial_days', 'master_admin_email'));