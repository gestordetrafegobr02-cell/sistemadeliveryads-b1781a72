DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS setting
        WHERE setting LIKE 'search_path=public%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path TO pg_catalog, public, pg_temp',
      fn.signature
    );
  END LOOP;
END
$$;
