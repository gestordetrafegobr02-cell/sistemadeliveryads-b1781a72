-- Add global meta_pixel_id setting and allow public read
INSERT INTO public.global_settings (key, value)
VALUES ('meta_pixel_id', '')
ON CONFLICT (key) DO NOTHING;

-- Update public read policy to include meta_pixel_id
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON public.global_settings;
CREATE POLICY "Public can read whitelisted settings"
ON public.global_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['subscription_price'::text, 'default_trial_days'::text, 'master_admin_email'::text, 'owner_whatsapp'::text, 'meta_pixel_id'::text]));