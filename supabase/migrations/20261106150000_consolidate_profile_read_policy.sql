DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users and admins can view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR has_role((select auth.uid()), 'admin'::public.app_role));
