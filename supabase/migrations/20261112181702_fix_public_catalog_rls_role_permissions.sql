CREATE OR REPLACE FUNCTION public.is_store_publicly_active(p_store_id uuid)
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
REVOKE ALL ON FUNCTION public.is_store_publicly_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_store_publicly_active(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public catalog categories limited to active stores" ON public.categories;
CREATE POLICY "Anonymous catalog categories limited to active stores"
ON public.categories FOR SELECT TO anon
USING (public.is_store_publicly_active(store_id));
CREATE POLICY "Authenticated catalog categories limited by membership"
ON public.categories FOR SELECT TO authenticated
USING (
  public.is_store_publicly_active(store_id)
  OR public.has_store_access(store_id, (SELECT auth.uid()))
  OR public.is_master_admin()
);

DROP POLICY IF EXISTS "Public catalog products limited to active stores" ON public.products;
CREATE POLICY "Anonymous catalog products limited to active stores"
ON public.products FOR SELECT TO anon
USING (public.is_store_publicly_active(store_id));
CREATE POLICY "Authenticated catalog products limited by membership"
ON public.products FOR SELECT TO authenticated
USING (
  public.is_store_publicly_active(store_id)
  OR public.has_store_access(store_id, (SELECT auth.uid()))
  OR public.is_master_admin()
);

DROP POLICY IF EXISTS "Public product modifiers limited to active stores" ON public.product_modifiers;
CREATE POLICY "Anonymous product modifiers limited to active stores"
ON public.product_modifiers FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_modifiers.product_id
      AND public.is_store_publicly_active(p.store_id)
  )
);
CREATE POLICY "Authenticated product modifiers limited by membership"
ON public.product_modifiers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_modifiers.product_id
      AND (
        public.is_store_publicly_active(p.store_id)
        OR public.has_store_access(p.store_id, (SELECT auth.uid()))
        OR public.is_master_admin()
      )
  )
);
