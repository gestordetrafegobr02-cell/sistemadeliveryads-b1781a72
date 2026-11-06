-- Reduce per-row auth overhead and remove duplicate owner policies.
DO $$
DECLARE
  p record;
  v_using text;
  v_check text;
  v_stmt text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (coalesce(qual, '') LIKE '%auth.uid()%' OR coalesce(with_check, '') LIKE '%auth.uid()%')
  LOOP
    v_using := CASE WHEN p.qual IS NULL THEN NULL
                    ELSE replace(p.qual, 'auth.uid()', '(select auth.uid())') END;
    v_check := CASE WHEN p.with_check IS NULL THEN NULL
                    ELSE replace(p.with_check, 'auth.uid()', '(select auth.uid())') END;
    v_stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF v_using IS NOT NULL THEN
      v_stmt := v_stmt || format(' USING (%s)', v_using);
    END IF;
    IF v_check IS NOT NULL THEN
      v_stmt := v_stmt || format(' WITH CHECK (%s)', v_check);
    END IF;
    EXECUTE v_stmt;
  END LOOP;
END
$$;

-- These owner policies duplicate the manager/member policies, whose helper
-- functions already resolve store owners from stores.owner_id.
DROP POLICY IF EXISTS "Store owners can view abandoned carts" ON public.abandoned_carts;
DROP POLICY IF EXISTS "Store owners can update abandoned carts" ON public.abandoned_carts;
DROP POLICY IF EXISTS "Owners can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Owners manage library" ON public.modifier_library;
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can update their orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can manage products" ON public.products;

CREATE INDEX IF NOT EXISTS idx_sales_lead_drafts_converted_lead_id
  ON public.sales_lead_drafts (converted_lead_id)
  WHERE converted_lead_id IS NOT NULL;
