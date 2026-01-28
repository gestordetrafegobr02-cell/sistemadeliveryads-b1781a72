-- Add recovery_delay_minutes column to stores table
ALTER TABLE public.stores
ADD COLUMN recovery_delay_minutes integer NOT NULL DEFAULT 15;

-- Add comment for documentation
COMMENT ON COLUMN public.stores.recovery_delay_minutes IS 'Minutes of inactivity before a cart is considered abandoned';