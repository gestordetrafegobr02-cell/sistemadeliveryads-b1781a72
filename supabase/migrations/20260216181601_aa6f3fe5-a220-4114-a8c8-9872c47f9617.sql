
-- Add store_template_style column to stores table for multi-template system
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS store_template_style text DEFAULT 'default';

-- Add comment for documentation
COMMENT ON COLUMN public.stores.store_template_style IS 'Visual template style: default, premium_dark, classic_red, clean_green';
