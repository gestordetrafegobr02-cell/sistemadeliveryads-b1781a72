CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_store_publicly_active(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = p_store_id AND s.is_active = true
  );
$$;
REVOKE ALL ON FUNCTION private.is_store_publicly_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_store_publicly_active(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anonymous catalog categories limited to active stores" ON public.categories;
CREATE POLICY "Anonymous catalog categories limited to active stores"
ON public.categories FOR SELECT TO anon
USING (private.is_store_publicly_active(store_id));
DROP POLICY IF EXISTS "Authenticated catalog categories limited by membership" ON public.categories;
CREATE POLICY "Authenticated catalog categories limited by membership"
ON public.categories FOR SELECT TO authenticated
USING (
  private.is_store_publicly_active(store_id)
  OR public.has_store_access(store_id, (SELECT auth.uid()))
  OR public.is_master_admin()
);

DROP POLICY IF EXISTS "Anonymous catalog products limited to active stores" ON public.products;
CREATE POLICY "Anonymous catalog products limited to active stores"
ON public.products FOR SELECT TO anon
USING (private.is_store_publicly_active(store_id));
DROP POLICY IF EXISTS "Authenticated catalog products limited by membership" ON public.products;
CREATE POLICY "Authenticated catalog products limited by membership"
ON public.products FOR SELECT TO authenticated
USING (
  private.is_store_publicly_active(store_id)
  OR public.has_store_access(store_id, (SELECT auth.uid()))
  OR public.is_master_admin()
);

DROP POLICY IF EXISTS "Anonymous product modifiers limited to active stores" ON public.product_modifiers;
CREATE POLICY "Anonymous product modifiers limited to active stores"
ON public.product_modifiers FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_modifiers.product_id
      AND private.is_store_publicly_active(p.store_id)
  )
);
DROP POLICY IF EXISTS "Authenticated product modifiers limited by membership" ON public.product_modifiers;
CREATE POLICY "Authenticated product modifiers limited by membership"
ON public.product_modifiers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_modifiers.product_id
      AND (
        private.is_store_publicly_active(p.store_id)
        OR public.has_store_access(p.store_id, (SELECT auth.uid()))
        OR public.is_master_admin()
      )
  )
);

DROP FUNCTION IF EXISTS public.is_store_publicly_active(uuid);
REVOKE ALL ON FUNCTION public.get_store_checkout_info(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_upsell_products(uuid, integer) FROM PUBLIC, anon, authenticated;
