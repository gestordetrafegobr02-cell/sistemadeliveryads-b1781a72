CREATE OR REPLACE FUNCTION public.protect_store_platform_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_master_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'platform_managed_store_fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_store_platform_fields ON public.stores;
CREATE TRIGGER protect_store_platform_fields
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_store_platform_fields();

REVOKE DELETE ON public.stores FROM authenticated;

DROP POLICY IF EXISTS "Owners insert store members" ON public.store_members;
CREATE POLICY "Owners insert non-owner store members"
ON public.store_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_store_owner(store_id, (SELECT auth.uid()))
  AND role <> 'owner'::public.store_role
);

DROP POLICY IF EXISTS "Owners update store members" ON public.store_members;
CREATE POLICY "Owners update non-owner store members"
ON public.store_members FOR UPDATE TO authenticated
USING (public.is_store_owner(store_id, (SELECT auth.uid())))
WITH CHECK (
  public.is_store_owner(store_id, (SELECT auth.uid()))
  AND role <> 'owner'::public.store_role
);
