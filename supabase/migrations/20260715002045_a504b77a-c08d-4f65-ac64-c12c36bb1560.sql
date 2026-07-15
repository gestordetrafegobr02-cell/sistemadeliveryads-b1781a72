
-- Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.store_role AS ENUM ('owner','manager','attendant','kitchen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de membros
CREATE TABLE IF NOT EXISTS public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.store_role NOT NULL DEFAULT 'attendant',
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares (security definer, evitam recursão em policies)
CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_store_role(_store_id uuid, _user_id uuid)
RETURNS public.store_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = _user_id) THEN 'owner'::public.store_role
    ELSE (SELECT role FROM public.store_members WHERE store_id = _store_id AND user_id = _user_id LIMIT 1)
  END
$$;

CREATE OR REPLACE FUNCTION public.has_store_access(_store_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_store_role(_store_id, _user_id) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.has_store_role(_store_id uuid, _user_id uuid, _roles public.store_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_store_role(_store_id, _user_id) = ANY(_roles)
$$;

-- Policies store_members
DROP POLICY IF EXISTS "Owners manage members" ON public.store_members;
CREATE POLICY "Owners manage members" ON public.store_members
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view themselves" ON public.store_members;
CREATE POLICY "Members can view themselves" ON public.store_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_store_members_updated ON public.store_members;
CREATE TRIGGER trg_store_members_updated BEFORE UPDATE ON public.store_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Estender policies existentes para membros

-- ORDERS: membros (qualquer papel) podem ver e atualizar pedidos
DROP POLICY IF EXISTS "Members can view store orders" ON public.orders;
CREATE POLICY "Members can view store orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_store_access(store_id, auth.uid()));

DROP POLICY IF EXISTS "Members can update store orders" ON public.orders;
CREATE POLICY "Members can update store orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));

-- PRODUCTS / CATEGORIES / MODIFIERS / UPSELL / ABANDONED: managers têm acesso total
DROP POLICY IF EXISTS "Managers manage products" ON public.products;
CREATE POLICY "Managers manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

DROP POLICY IF EXISTS "Managers manage categories" ON public.categories;
CREATE POLICY "Managers manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

DROP POLICY IF EXISTS "Managers manage modifiers" ON public.product_modifiers;
CREATE POLICY "Managers manage modifiers" ON public.product_modifiers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_modifiers.product_id
    AND public.has_store_role(p.store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_modifiers.product_id
    AND public.has_store_role(p.store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[])));

DROP POLICY IF EXISTS "Managers manage upsell rules" ON public.upsell_rules;
CREATE POLICY "Managers manage upsell rules" ON public.upsell_rules
  FOR ALL TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

DROP POLICY IF EXISTS "Managers view abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Managers view abandoned carts" ON public.abandoned_carts
  FOR SELECT TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

DROP POLICY IF EXISTS "Managers update abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Managers update abandoned carts" ON public.abandoned_carts
  FOR UPDATE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

-- STORES: managers podem atualizar
DROP POLICY IF EXISTS "Managers can update store" ON public.stores;
CREATE POLICY "Managers can update store" ON public.stores
  FOR UPDATE TO authenticated
  USING (public.has_store_role(id, auth.uid(), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (public.has_store_role(id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

DROP POLICY IF EXISTS "Members can view store" ON public.stores;
CREATE POLICY "Members can view store" ON public.stores
  FOR SELECT TO authenticated
  USING (public.has_store_access(id, auth.uid()));

-- RPC: lista membros com email para o admin da loja
CREATE OR REPLACE FUNCTION public.list_store_members(p_store_id uuid)
RETURNS TABLE (id uuid, user_id uuid, email text, role public.store_role, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_store_owner(p_store_id, auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
  SELECT sm.id, sm.user_id,
         COALESCE(p.email, sm.email) as email,
         sm.role, sm.created_at
  FROM public.store_members sm
  LEFT JOIN public.profiles p ON p.id = sm.user_id
  WHERE sm.store_id = p_store_id
  ORDER BY sm.created_at DESC;
END; $$;

-- RPC: retorna a loja acessível pelo usuário logado (dono ou membro)
CREATE OR REPLACE FUNCTION public.get_my_store()
RETURNS TABLE (store_id uuid, role public.store_role, is_owner boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, 'owner'::public.store_role, true
  FROM public.stores s WHERE s.owner_id = auth.uid()
  UNION ALL
  SELECT sm.store_id, sm.role, false
  FROM public.store_members sm WHERE sm.user_id = auth.uid()
  LIMIT 1
$$;
