
-- Explicit deny-all SELECT policy on store_secrets to make intent clear.
-- Tokens must only be accessed by the service_role from edge functions.
DROP POLICY IF EXISTS "Block all client reads of secrets" ON public.store_secrets;
CREATE POLICY "Block all client reads of secrets"
ON public.store_secrets
FOR SELECT
TO anon, authenticated
USING (false);

-- Explicit deny-all for INSERT/UPDATE/DELETE from clients as well.
-- Writes happen only via SECURITY DEFINER function set_store_mercadopago_token.
DROP POLICY IF EXISTS "Block all client writes of secrets" ON public.store_secrets;
CREATE POLICY "Block all client writes of secrets"
ON public.store_secrets
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Remove broad admin SELECT on user_roles to reduce privilege escalation blast radius.
-- Only the master admin (via "Master admin can manage roles" ALL policy) and the
-- has_role() SECURITY DEFINER function (which bypasses RLS) need access.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Users may still read their own roles (needed for client-side admin checks
-- through has_role/is_admin RPCs which use SECURITY DEFINER; this also lets a
-- user inspect their own role).
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
