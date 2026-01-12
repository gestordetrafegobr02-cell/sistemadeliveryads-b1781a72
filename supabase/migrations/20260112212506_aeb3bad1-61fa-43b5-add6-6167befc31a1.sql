-- Safe permissions for public browsing + checkout
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.stores, public.categories, public.products TO anon;
GRANT INSERT ON TABLE public.orders TO anon;

-- Data cleanup: never keep base64 images in DB (store only URLs)
UPDATE public.products
SET image_url = NULL
WHERE image_url LIKE 'data:%';

UPDATE public.stores
SET logo_url = NULL
WHERE logo_url LIKE 'data:%';
