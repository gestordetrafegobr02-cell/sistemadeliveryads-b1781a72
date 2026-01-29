-- Add primary_color column to stores table for theme customization
ALTER TABLE public.stores ADD COLUMN primary_color TEXT DEFAULT NULL;