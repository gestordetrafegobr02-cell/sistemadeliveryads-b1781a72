-- Add delivery_fee column to stores table
ALTER TABLE public.stores ADD COLUMN delivery_fee NUMERIC DEFAULT 0;