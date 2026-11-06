DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users and admins can view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR has_role((select auth.uid()), 'admin'::public.app_role));

-- Prevent authenticated callers from probing other users' roles or store membership.
CREATE OR REPLACE FUNCTION public.get_store_role(_store_id uuid, _user_id uuid)
RETURNS public.store_role
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF _user_id IS NULL OR (_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_master_admin()) THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = _user_id) THEN RETURN 'owner'::public.store_role; END IF;
  RETURN (SELECT sm.role FROM public.store_members sm WHERE sm.store_id = _store_id AND sm.user_id = _user_id LIMIT 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF _user_id IS NULL OR (_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_master_admin()) THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = _role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF _user_id IS NULL OR (_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_master_admin()) THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.stores s WHERE s.id = _store_id AND s.owner_id = _user_id);
END;
$function$;
