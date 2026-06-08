
-- 1. Lock down user_roles: only master admin can manage (prevents privilege escalation)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Master admin can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- 2. Restrict full stores SELECT (incl. pix_key, whatsapp) to master admin only
DROP POLICY IF EXISTS "Admins can view all stores" ON public.stores;
-- Master admin already has full ALL access via "Master admin full access" policy

-- 3. Explicit anon SELECT deny on abandoned_carts (defense in depth)
DROP POLICY IF EXISTS "Block anonymous reads on abandoned_carts" ON public.abandoned_carts;
CREATE POLICY "Block anonymous reads on abandoned_carts"
ON public.abandoned_carts FOR SELECT
TO anon
USING (false);
