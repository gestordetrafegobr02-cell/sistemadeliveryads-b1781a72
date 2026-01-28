-- Create global_settings table for platform-wide configuration
CREATE TABLE public.global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Only master admin can manage settings
CREATE POLICY "Master admin can manage global settings"
  ON public.global_settings
  FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- Anyone can read settings (for landing page price display)
CREATE POLICY "Anyone can read global settings"
  ON public.global_settings
  FOR SELECT
  USING (true);

-- Insert default values
INSERT INTO public.global_settings (key, value) VALUES
  ('owner_whatsapp', '5511999999999'),
  ('subscription_price', '97'),
  ('default_trial_days', '7');

-- Create function to get a setting value
CREATE OR REPLACE FUNCTION public.get_global_setting(setting_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.global_settings WHERE key = setting_key LIMIT 1;
$$;

-- Create function to update a setting (master admin only)
CREATE OR REPLACE FUNCTION public.update_global_setting(setting_key text, setting_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Master admin access required';
  END IF;
  
  UPDATE public.global_settings 
  SET value = setting_value, updated_at = now(), updated_by = auth.uid()
  WHERE key = setting_key;
  
  RETURN true;
END;
$$;