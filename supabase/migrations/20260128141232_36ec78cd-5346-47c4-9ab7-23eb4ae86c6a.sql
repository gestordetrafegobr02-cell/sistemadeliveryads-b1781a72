-- Create function to get platform-wide stats for Super Admin
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Only master admin can call this function
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Master admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_revenue', COALESCE((
      SELECT SUM(o.total) 
      FROM orders o 
      WHERE COALESCE(o.status, 'pending') NOT IN ('cancelado', 'cancelled', 'canceled')
    ), 0),
    'total_orders', (
      SELECT COUNT(*) 
      FROM orders 
      WHERE COALESCE(status, 'pending') NOT IN ('cancelado', 'cancelled', 'canceled')
    ),
    'total_stores', (SELECT COUNT(*) FROM stores),
    'active_stores', (SELECT COUNT(*) FROM stores WHERE is_active = true),
    'stores_on_trial', (
      SELECT COUNT(*) 
      FROM stores 
      WHERE trial_expires_at IS NOT NULL 
        AND trial_expires_at > now()
    ),
    'expired_trials', (
      SELECT COUNT(*) 
      FROM stores 
      WHERE trial_expires_at IS NOT NULL 
        AND trial_expires_at <= now()
    ),
    'total_users', (SELECT COUNT(*) FROM profiles)
  ) INTO result;

  RETURN result;
END;
$function$;