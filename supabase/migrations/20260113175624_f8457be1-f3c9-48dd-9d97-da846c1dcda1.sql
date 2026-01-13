-- 1. ORDERS TABLE: Add SELECT policy for store owners only
DROP POLICY IF EXISTS "Owners can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;

-- Allow anyone to create orders (customers placing orders)
CREATE POLICY "Customers can place orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);

-- Only store owners can view orders for their stores
CREATE POLICY "Store owners can view their orders"
ON public.orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores
    WHERE stores.id = orders.store_id
      AND stores.owner_id = auth.uid()
  )
);

-- Store owners can update/delete their orders
CREATE POLICY "Store owners can manage their orders"
ON public.orders
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores
    WHERE stores.id = orders.store_id
      AND stores.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners can delete their orders"
ON public.orders
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores
    WHERE stores.id = orders.store_id
      AND stores.owner_id = auth.uid()
  )
);

-- 2. PRODUCTS TABLE: Rename policy for clarity
DROP POLICY IF EXISTS "Public can view products" ON public.products;

CREATE POLICY "Products are publicly viewable"
ON public.products
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

-- 3. CATEGORIES TABLE: Rename policy for clarity
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;

CREATE POLICY "Categories are publicly viewable"
ON public.categories
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

-- 4. STORES TABLE: Rename policy for clarity
DROP POLICY IF EXISTS "Public can view stores" ON public.stores;

CREATE POLICY "Stores are publicly viewable"
ON public.stores
AS PERMISSIVE
FOR SELECT
TO public
USING (true);