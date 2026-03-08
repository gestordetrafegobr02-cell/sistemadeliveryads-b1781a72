-- Add owner_whatsapp to the whitelist since it's needed by store owners for support contact
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON public.global_settings;

CREATE POLICY "Public can read whitelisted settings"
  ON public.global_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('subscription_price', 'default_trial_days', 'master_admin_email', 'owner_whatsapp'));