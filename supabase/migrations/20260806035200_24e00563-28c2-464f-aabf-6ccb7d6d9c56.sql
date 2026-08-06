ALTER TABLE products ALTER COLUMN has_addons SET DEFAULT true;
UPDATE products SET has_addons = true WHERE has_addons IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;