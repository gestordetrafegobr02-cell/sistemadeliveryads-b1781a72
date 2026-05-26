
-- Hardcode master admin email inside the function to remove dependency on
-- the writable global_settings table. This eliminates the privilege-escalation
-- and lockout risks tied to the master_admin_email row.
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
      = 'igormoises.ads@gmail.com',
    false
  )
$function$;
