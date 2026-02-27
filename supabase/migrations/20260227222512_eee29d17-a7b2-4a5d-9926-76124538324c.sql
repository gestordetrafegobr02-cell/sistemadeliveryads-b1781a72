
-- Drop the restrictive SELECT policy for public access
DROP POLICY IF EXISTS "Anyone can view active stores for checkout" ON public.stores;

-- Recreate as PERMISSIVE (default) so anonymous users can read active stores
CREATE POLICY "Anyone can view active stores for checkout"
ON public.stores
FOR SELECT
USING (is_active = true);
