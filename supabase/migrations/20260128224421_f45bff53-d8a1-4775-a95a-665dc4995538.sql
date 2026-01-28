
-- Update the create_user_store_with_template function to include image_url
CREATE OR REPLACE FUNCTION public.create_user_store_with_template(p_store_name text, p_store_slug text, p_template_slug text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template record;
  v_store_id uuid;
  v_category record;
  v_product record;
  v_category_id uuid;
  v_category_map jsonb := '{}'::jsonb;
  v_user_id uuid;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a store
  IF EXISTS (SELECT 1 FROM public.stores WHERE owner_id = v_user_id) THEN
    RAISE EXCEPTION 'User already has a store';
  END IF;

  -- Validate store name
  IF p_store_name IS NULL OR TRIM(p_store_name) = '' THEN
    RAISE EXCEPTION 'Store name is required';
  END IF;

  -- Validate and sanitize slug
  IF p_store_slug IS NULL OR TRIM(p_store_slug) = '' THEN
    RAISE EXCEPTION 'Store slug is required';
  END IF;

  -- Check if slug is unique
  IF EXISTS (SELECT 1 FROM public.stores WHERE LOWER(slug) = LOWER(p_store_slug)) THEN
    RAISE EXCEPTION 'Slug already in use';
  END IF;

  -- Create the store
  INSERT INTO public.stores (name, slug, owner_id, is_active, is_open_manual)
  VALUES (TRIM(p_store_name), LOWER(TRIM(p_store_slug)), v_user_id, true, true)
  RETURNING id INTO v_store_id;

  -- If template is specified, populate with template data
  IF p_template_slug IS NOT NULL AND p_template_slug != 'empty' THEN
    SELECT * INTO v_template FROM public.store_templates WHERE slug = p_template_slug;
    
    IF v_template IS NOT NULL THEN
      -- Create categories and map names to IDs
      FOR v_category IN SELECT * FROM jsonb_array_elements(v_template.categories)
      LOOP
        INSERT INTO public.categories (store_id, name, sort_order)
        VALUES (v_store_id, v_category.value->>'name', (v_category.value->>'sort_order')::int)
        RETURNING id INTO v_category_id;
        
        v_category_map := v_category_map || jsonb_build_object(v_category.value->>'name', v_category_id);
      END LOOP;

      -- Create products WITH image_url
      FOR v_product IN SELECT * FROM jsonb_array_elements(v_template.products)
      LOOP
        INSERT INTO public.products (store_id, category_id, name, description, price, is_available, image_url)
        VALUES (
          v_store_id,
          (v_category_map->>(v_product.value->>'category'))::uuid,
          v_product.value->>'name',
          v_product.value->>'description',
          (v_product.value->>'price')::numeric,
          true,
          v_product.value->>'image_url'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN v_store_id;
END;
$function$;
