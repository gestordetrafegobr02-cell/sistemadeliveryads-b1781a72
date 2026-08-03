ALTER TABLE public.product_modifiers
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_min integer NOT NULL DEFAULT 0;

ALTER TABLE public.modifier_library
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_min integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.cascade_library_to_product_modifiers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.product_modifiers
     SET name = NEW.name,
         price = NEW.price,
         is_available = NEW.is_available,
         group_name = NEW.group_name,
         group_max = NEW.group_max,
         group_min = NEW.group_min,
         is_default = NEW.is_default,
         group_sort = NEW.group_sort
   WHERE library_item_id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_library_group_to_product(p_product_id uuid, p_group_name text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  DELETE FROM public.product_modifiers
    WHERE product_id = p_product_id
      AND library_item_id IN (
        SELECT id FROM public.modifier_library
         WHERE store_id = v_store_id AND group_name = p_group_name
      );

  INSERT INTO public.product_modifiers (
    product_id, library_item_id, name, price, is_available,
    group_name, group_max, group_min, is_default, group_sort, sort_order
  )
  SELECT p_product_id, ml.id, ml.name, ml.price, ml.is_available,
         ml.group_name, ml.group_max, ml.group_min, ml.is_default, ml.group_sort, ml.sort_order
    FROM public.modifier_library ml
   WHERE ml.store_id = v_store_id AND ml.group_name = p_group_name;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;