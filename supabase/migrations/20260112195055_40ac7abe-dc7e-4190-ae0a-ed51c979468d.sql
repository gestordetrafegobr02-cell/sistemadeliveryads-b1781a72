-- Add store status columns for opening hours and manual toggle
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '{"monday":{"open":"08:00","close":"22:00"},"tuesday":{"open":"08:00","close":"22:00"},"wednesday":{"open":"08:00","close":"22:00"},"thursday":{"open":"08:00","close":"22:00"},"friday":{"open":"08:00","close":"22:00"},"saturday":{"open":"08:00","close":"22:00"},"sunday":{"open":"08:00","close":"22:00"}}'::jsonb,
ADD COLUMN IF NOT EXISTS is_open_manual boolean DEFAULT true;