-- Drop existing restrictive policies and recreate as permissive
-- Categories
DROP POLICY IF EXISTS "Owners can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;

CREATE POLICY "Owners can manage categories" 
ON public.categories FOR ALL 
USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid()));

CREATE POLICY "Public can view categories" 
ON public.categories FOR SELECT 
USING (true);

-- Products
DROP POLICY IF EXISTS "Owners can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view products" ON public.products;

CREATE POLICY "Owners can manage products" 
ON public.products FOR ALL 
USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid()));

CREATE POLICY "Public can view products" 
ON public.products FOR SELECT 
USING (true);

-- Stores
DROP POLICY IF EXISTS "Owners can delete own store" ON public.stores;
DROP POLICY IF EXISTS "Owners can insert own store" ON public.stores;
DROP POLICY IF EXISTS "Owners can update own store" ON public.stores;
DROP POLICY IF EXISTS "Owners can view own store" ON public.stores;
DROP POLICY IF EXISTS "Public can view stores" ON public.stores;

CREATE POLICY "Owners can manage own store" 
ON public.stores FOR ALL 
USING (auth.uid() = owner_id);

CREATE POLICY "Public can view stores" 
ON public.stores FOR SELECT 
USING (true);

-- Orders
DROP POLICY IF EXISTS "Owners can view orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;

CREATE POLICY "Owners can manage orders" 
ON public.orders FOR ALL 
USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()));

CREATE POLICY "Public can insert orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- Profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can manage own profile" 
ON public.profiles FOR ALL 
USING (auth.uid() = id);