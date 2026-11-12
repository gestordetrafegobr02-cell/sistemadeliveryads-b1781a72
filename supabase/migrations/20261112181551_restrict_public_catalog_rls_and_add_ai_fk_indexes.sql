DROP POLICY IF EXISTS "Categories are publicly viewable" ON public.categories;
CREATE POLICY "Public catalog categories limited to active stores" ON public.categories FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = categories.store_id AND (
    s.is_active = true OR public.has_store_access(s.id, (SELECT auth.uid())) OR public.is_master_admin()
  ))
);

DROP POLICY IF EXISTS "Products are publicly viewable" ON public.products;
CREATE POLICY "Public catalog products limited to active stores" ON public.products FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND (
    s.is_active = true OR public.has_store_access(s.id, (SELECT auth.uid())) OR public.is_master_admin()
  ))
);

DROP POLICY IF EXISTS "Modifiers are publicly viewable" ON public.product_modifiers;
CREATE POLICY "Public product modifiers limited to active stores" ON public.product_modifiers FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_modifiers.product_id AND (
      s.is_active = true OR public.has_store_access(s.id, (SELECT auth.uid())) OR public.is_master_admin()
    ))
);

DROP POLICY IF EXISTS "Library publicly viewable" ON public.modifier_library;
CREATE POLICY "Store managers and master can view modifier library" ON public.modifier_library FOR SELECT TO authenticated USING (
  public.is_master_admin() OR public.has_store_role(
    modifier_library.store_id, (SELECT auth.uid()),
    ARRAY['owner'::public.store_role, 'manager'::public.store_role]
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_created_by
  ON public.ai_credit_ledger (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_pricing_updated_by
  ON public.ai_model_pricing (updated_by) WHERE updated_by IS NOT NULL;
