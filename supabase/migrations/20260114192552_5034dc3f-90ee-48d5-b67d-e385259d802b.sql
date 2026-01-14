-- =====================================================
-- FULL SECURITY OVERHAUL MIGRATION
-- =====================================================

-- 1) CREATE USER ROLES SYSTEM
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) RECREATE stores_public VIEW (EXCLUDE SENSITIVE DATA)
-- =====================================================
DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    slug,
    logo_url,
    opening_hours,
    is_open_manual,
    delivery_fee,
    created_at,
    updated_at
  FROM public.stores;
-- NOTE: pix_key, whatsapp, facebook_pixel_id, owner_id are EXCLUDED

-- 3) UPDATE stores TABLE RLS POLICIES
-- =====================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Only owners can access stores" ON public.stores;
DROP POLICY IF EXISTS "Block anonymous access to stores" ON public.stores;

-- Create new strict policies
CREATE POLICY "Owners can manage their stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can view all stores"
  ON public.stores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No anonymous access to stores"
  ON public.stores FOR SELECT
  TO anon
  USING (false);

-- 4) UPDATE orders TABLE RLS POLICIES
-- =====================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can manage their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can delete their orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can place orders" ON public.orders;
DROP POLICY IF EXISTS "Anonymous cannot read orders" ON public.orders;

-- Create new strict policies
CREATE POLICY "Store owners can view their orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
      AND stores.owner_id = auth.uid()
  ));

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners can update their orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
      AND stores.owner_id = auth.uid()
  ));

CREATE POLICY "Store owners can delete their orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
      AND stores.owner_id = auth.uid()
  ));

-- Customers can place orders (with validation in trigger)
CREATE POLICY "Customers can place orders"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    store_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id)
    AND customer_name IS NOT NULL
    AND LENGTH(TRIM(customer_name)) BETWEEN 1 AND 200
    AND items IS NOT NULL
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) > 0
    AND (customer_phone IS NULL OR LENGTH(customer_phone) <= 50)
    AND (address IS NULL OR LENGTH(address) <= 500)
    AND (payment_method IS NULL OR LENGTH(payment_method) <= 50)
  );

-- Block direct anonymous reads (use RPC with session token instead)
CREATE POLICY "No anonymous reads on orders"
  ON public.orders FOR SELECT
  TO anon
  USING (false);

-- 5) PROFILES TABLE - STRICT RLS
-- =====================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users manage own profile only" ON public.profiles;
DROP POLICY IF EXISTS "No anonymous access" ON public.profiles;

-- Create strict policies
CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No anonymous access to profiles"
  ON public.profiles FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- 6) UPDATE get_store_checkout_info FOR SECURITY
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_store_checkout_info(store_slug_param text)
RETURNS TABLE(pix_key text, whatsapp text, store_name text, delivery_fee numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate input
  IF store_slug_param IS NULL OR TRIM(store_slug_param) = '' THEN
    RETURN;
  END IF;
  
  -- Sanitize input length
  IF LENGTH(store_slug_param) > 100 THEN
    RETURN;
  END IF;
  
  -- Return checkout info only for active stores
  RETURN QUERY
  SELECT s.pix_key, s.whatsapp, s.name, s.delivery_fee
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug_param))
    AND s.is_open_manual IS NOT FALSE;
END;
$$;

-- 7) UPDATE get_public_store_by_slug FOR SECURITY
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_public_store_by_slug(store_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, opening_hours jsonb, is_open_manual boolean, delivery_fee numeric, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate input
  IF store_slug IS NULL OR TRIM(store_slug) = '' THEN
    RETURN;
  END IF;
  
  -- Sanitize input length
  IF LENGTH(store_slug) > 100 THEN
    RETURN;
  END IF;
  
  -- Return only non-sensitive store data (excludes pix_key, whatsapp, facebook_pixel_id)
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.logo_url,
    s.opening_hours,
    s.is_open_manual,
    s.delivery_fee,
    s.created_at,
    s.updated_at
  FROM public.stores s
  WHERE LOWER(s.slug) = LOWER(TRIM(store_slug));
END;
$$;

-- 8) CREATE ADMIN DASHBOARD RPC FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_all_stores_admin()
RETURNS TABLE(
  id uuid, 
  name text, 
  slug text, 
  owner_id uuid,
  owner_email text,
  whatsapp text, 
  pix_key text,
  delivery_fee numeric,
  is_open_manual boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.owner_id,
    p.email as owner_email,
    s.whatsapp,
    s.pix_key,
    s.delivery_fee,
    s.is_open_manual,
    s.created_at
  FROM public.stores s
  LEFT JOIN public.profiles p ON p.id = s.owner_id
  ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_orders_admin()
RETURNS TABLE(
  id uuid,
  store_id uuid,
  store_name text,
  customer_name text,
  customer_phone text,
  items jsonb,
  total numeric,
  status text,
  address text,
  payment_method text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.store_id,
    s.name as store_name,
    o.customer_name,
    o.customer_phone,
    o.items,
    o.total,
    o.status,
    o.address,
    o.payment_method,
    o.created_at
  FROM public.orders o
  LEFT JOIN public.stores s ON s.id = o.store_id
  ORDER BY o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  id uuid,
  email text,
  has_store boolean,
  store_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    (s.id IS NOT NULL) as has_store,
    s.name as store_name,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.stores s ON s.owner_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- 9) CREATE FUNCTION TO CHECK IF USER IS ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;