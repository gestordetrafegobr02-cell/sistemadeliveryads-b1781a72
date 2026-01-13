-- 1. Drop the overly permissive stores SELECT policy
DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;

-- 2. Create a new policy that denies direct public SELECT on stores base table
-- The stores_public view (with security_invoker=on) will still work because 
-- it was granted explicit SELECT permission
CREATE POLICY "No direct public access to stores"
ON public.stores
FOR SELECT
TO anon
USING (false);

-- 3. Ensure authenticated users can only see their own stores
-- (The existing "Owners can manage own store" policy handles this for ALL operations)
-- We need a separate SELECT policy for authenticated users to see only their stores
CREATE POLICY "Authenticated users see own stores only"
ON public.stores
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- 4. Update the profiles policy to be explicit about SELECT vs other operations
-- First drop the ALL policy
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;

-- Create separate policies for different operations
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5. Deny anon access to profiles entirely
CREATE POLICY "No anon access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 6. Add storage policy to prevent public listing (only direct URL access)
-- Note: Objects are still accessible via direct URL if bucket is public
-- This prevents listing/browsing files
DROP POLICY IF EXISTS "Public read access for store assets" ON storage.objects;

CREATE POLICY "Direct URL access only for store assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'store-assets');