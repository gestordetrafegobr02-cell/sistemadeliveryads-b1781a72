-- Fix RLS policies for orders table
-- The issue is that all policies are RESTRICTIVE, which means ALL must pass
-- We need PERMISSIVE policies where ANY matching policy grants access

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "No anonymous reads on orders" ON public.orders;

-- Create PERMISSIVE SELECT policies (default is PERMISSIVE, explicitly stating for clarity)
CREATE POLICY "Store owners can view their orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = orders.store_id
    AND stores.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous users from reading orders (separate policy for anon role only)
CREATE POLICY "Block anonymous reads on orders"
ON public.orders
FOR SELECT
TO anon
USING (false);