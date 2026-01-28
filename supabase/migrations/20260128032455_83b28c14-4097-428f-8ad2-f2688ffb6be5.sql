-- Add upsell configuration columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS upsell_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS upsell_blocking_categories uuid[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.stores.upsell_enabled IS 'Whether upsell modal is enabled for this store';
COMMENT ON COLUMN public.stores.upsell_blocking_categories IS 'Category IDs that block upsell when present in cart';