-- Ensure public browsing is never blocked while keeping RLS enabled
-- (Fixes issues caused by RESTRICTIVE policies accidentally AND-ing public/owner rules)

-- Keep RLS ON
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Re-grant public read permissions (safe)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.stores, public.categories, public.products TO anon;

-- STORES: drop older variants + recreate as PERMISSIVE
DROP POLICY IF EXISTS "Owners can manage own store" ON public.stores;
DROP POLICY IF EXISTS "Owners can view own store" ON public.stores;
DROP POLICY IF EXISTS "Owners can update own store" ON public.stores;
DROP POLICY IF EXISTS "Owners can insert own store" ON public.stores;
DROP POLICY IF EXISTS "Owners can delete own store" ON public.stores;

CREATE POLICY "Owners can manage own store"
ON public.stores
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Public can view stores" ON public.stores;
CREATE POLICY "Public can view stores"
ON public.stores
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

-- CATEGORIES: recreate as PERMISSIVE
DROP POLICY IF EXISTS "Owners can manage categories" ON public.categories;
CREATE POLICY "Owners can manage categories"
ON public.categories
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores
    WHERE stores.id = categories.store_id
      AND stores.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores
    WHERE stores.id = categories.store_id
      AND stores.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
ON public.categories
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

-- PRODUCTS: recreate as PERMISSIVE
DROP POLICY IF EXISTS "Owners can manage products" ON public.products;
CREATE POLICY "Owners can manage products"
ON public.products
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores
    WHERE stores.id = products.store_id
      AND stores.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores
    WHERE stores.id = products.store_id
      AND stores.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
ON public.products
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

-- Cleanup: remove base64 / absurdly long blobs accidentally stored in URL columns
UPDATE public.products
SET image_url = NULL
WHERE image_url IS NOT NULL
  AND (image_url ~* '^data:' OR length(image_url) > 5000);

UPDATE public.stores
SET logo_url = NULL
WHERE logo_url IS NOT NULL
  AND (logo_url ~* '^data:' OR length(logo_url) > 5000);
