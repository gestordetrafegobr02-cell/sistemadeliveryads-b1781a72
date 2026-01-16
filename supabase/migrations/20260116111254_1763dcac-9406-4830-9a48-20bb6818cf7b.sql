-- Remove the restrictive anonymous SELECT policy on stores
DROP POLICY IF EXISTS "No anonymous access to stores" ON public.stores;

-- Create a permissive SELECT policy for stores that allows anonymous users to read basic store info
-- This is needed for order validation and checkout flow
CREATE POLICY "Anyone can view active stores for checkout"
ON public.stores
FOR SELECT
TO anon
USING (is_active = true);

-- Keep existing authenticated policies intact
-- The trigger validate_order_insert needs to read from stores to validate orders