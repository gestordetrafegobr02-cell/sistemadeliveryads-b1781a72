ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_addons boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_free_addons boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS free_addons_limit integer DEFAULT 0;

UPDATE public.products 
SET has_free_addons = true, free_addons_limit = 5 
WHERE name ILIKE '%Açaí de 1 Litro%';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
