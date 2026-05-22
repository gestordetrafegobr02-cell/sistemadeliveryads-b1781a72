
-- 1) PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_stores_slug_lower ON public.stores (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores (slug);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON public.products (store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_store ON public.categories (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON public.orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_store_created ON public.abandoned_carts (store_id, created_at DESC);

-- 2) PRICE VALIDATION TRIGGER
DROP TRIGGER IF EXISTS trg_validar_pedido_inserir ON public.orders;
DROP TRIGGER IF EXISTS trg_validate_order_insert ON public.orders;
CREATE TRIGGER trg_validar_pedido_inserir
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_insert();

-- 3) STORES PUBLIC READ SECURITY RESTRUCTURE
DROP POLICY IF EXISTS "Permitir leitura pública de lojas ativas" ON public.stores;
DROP POLICY IF EXISTS "Lojas são públicas para leitura" ON public.stores;
DROP POLICY IF EXISTS "Anyone can view active stores for checkout" ON public.stores;
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;

-- Strict anon policy: only active stores are readable; sensitive data must continue
-- to be fetched via SECURITY DEFINER RPCs (get_public_store_by_slug, get_store_payment_data)
-- which expose only whitelisted columns.
CREATE POLICY "Anon can read active stores only"
  ON public.stores
  FOR SELECT
  TO anon
  USING (is_active = true);
