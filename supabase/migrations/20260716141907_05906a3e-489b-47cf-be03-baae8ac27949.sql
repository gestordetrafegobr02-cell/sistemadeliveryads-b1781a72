
-- 1. Modifier library (per-store catalog)
CREATE TABLE public.modifier_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  group_name text NOT NULL DEFAULT 'Acompanhamentos',
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  group_max integer,
  group_sort integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, group_name, name)
);

GRANT SELECT ON public.modifier_library TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.modifier_library TO authenticated;
GRANT ALL ON public.modifier_library TO service_role;

ALTER TABLE public.modifier_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Library publicly viewable"
  ON public.modifier_library FOR SELECT USING (true);

CREATE POLICY "Owners manage library"
  ON public.modifier_library FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Managers manage library"
  ON public.modifier_library FOR ALL
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[]));

CREATE TRIGGER update_modifier_library_updated_at
  BEFORE UPDATE ON public.modifier_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Link product_modifiers to library
ALTER TABLE public.product_modifiers
  ADD COLUMN IF NOT EXISTS library_item_id uuid REFERENCES public.modifier_library(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_modifiers_library_item ON public.product_modifiers(library_item_id);

-- 3. Cascade updates from library -> product_modifiers
CREATE OR REPLACE FUNCTION public.cascade_library_to_product_modifiers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.product_modifiers
     SET name = NEW.name,
         price = NEW.price,
         is_available = NEW.is_available,
         group_name = NEW.group_name,
         group_max = NEW.group_max,
         group_sort = NEW.group_sort
   WHERE library_item_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_library ON public.modifier_library;
CREATE TRIGGER trg_cascade_library
  AFTER UPDATE ON public.modifier_library
  FOR EACH ROW EXECUTE FUNCTION public.cascade_library_to_product_modifiers();

-- 4. Helper: apply library group to a product (idempotent, replaces linked rows for that group)
CREATE OR REPLACE FUNCTION public.apply_library_group_to_product(
  p_product_id uuid,
  p_group_name text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_inserted integer := 0;
BEGIN
  SELECT store_id INTO v_store_id FROM public.products WHERE id = p_product_id;
  IF v_store_id IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.stores WHERE id = v_store_id AND owner_id = auth.uid())
    OR public.has_store_role(v_store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[])
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Remove old links for this group on this product
  DELETE FROM public.product_modifiers
    WHERE product_id = p_product_id
      AND library_item_id IN (
        SELECT id FROM public.modifier_library
         WHERE store_id = v_store_id AND group_name = p_group_name
      );

  -- Insert fresh copies
  INSERT INTO public.product_modifiers (
    product_id, library_item_id, name, price, is_available,
    group_name, group_max, group_sort, sort_order
  )
  SELECT p_product_id, ml.id, ml.name, ml.price, ml.is_available,
         ml.group_name, ml.group_max, ml.group_sort, ml.sort_order
    FROM public.modifier_library ml
   WHERE ml.store_id = v_store_id AND ml.group_name = p_group_name;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- 5. Helper: unlink (remove) a library group from a product
CREATE OR REPLACE FUNCTION public.remove_library_group_from_product(
  p_product_id uuid,
  p_group_name text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_removed integer := 0;
BEGIN
  SELECT store_id INTO v_store_id FROM public.products WHERE id = p_product_id;
  IF v_store_id IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.stores WHERE id = v_store_id AND owner_id = auth.uid())
    OR public.has_store_role(v_store_id, auth.uid(), ARRAY['owner','manager']::public.store_role[])
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  DELETE FROM public.product_modifiers
   WHERE product_id = p_product_id
     AND library_item_id IN (
       SELECT id FROM public.modifier_library
        WHERE store_id = v_store_id AND group_name = p_group_name
     );

  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END;
$$;
