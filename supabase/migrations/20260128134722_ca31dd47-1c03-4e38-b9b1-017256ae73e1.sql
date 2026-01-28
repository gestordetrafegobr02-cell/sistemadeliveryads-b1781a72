
-- Add upsell_products column to stores table for manual product selection
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS upsell_products uuid[] DEFAULT '{}'::uuid[];

-- Add comment for documentation
COMMENT ON COLUMN public.stores.upsell_products IS 'Array of product IDs manually selected by store owner for upsell suggestions';
