
CREATE OR REPLACE FUNCTION public.create_store_manual(
  p_store_name text,
  p_store_slug text,
  p_owner_email text,
  p_trial_days integer DEFAULT 14,
  p_template_slug text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_store_id uuid;
  v_template record;
  v_category record;
  v_product record;
  v_category_id uuid;
  v_category_map jsonb := '{}'::jsonb;
  v_trial_expires timestamp with time zone;
BEGIN
  -- Only master admin can call
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Master admin access required';
  END IF;

  -- Validate inputs
  IF p_store_name IS NULL OR TRIM(p_store_name) = '' THEN
    RAISE EXCEPTION 'Store name is required';
  END IF;
  IF p_store_slug IS NULL OR TRIM(p_store_slug) = '' THEN
    RAISE EXCEPTION 'Store slug is required';
  END IF;
  IF p_owner_email IS NULL OR TRIM(p_owner_email) = '' THEN
    RAISE EXCEPTION 'Owner email is required';
  END IF;

  -- Find user by email
  SELECT id INTO v_owner_id FROM auth.users WHERE email = LOWER(TRIM(p_owner_email));
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado com o email: %', p_owner_email;
  END IF;

  -- Check if user already has a store
  IF EXISTS (SELECT 1 FROM public.stores WHERE owner_id = v_owner_id) THEN
    RAISE EXCEPTION 'Este usuário já possui uma loja';
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM public.stores WHERE LOWER(slug) = LOWER(TRIM(p_store_slug))) THEN
    RAISE EXCEPTION 'Este slug já está em uso';
  END IF;

  -- Calculate trial expiration
  IF p_trial_days > 0 THEN
    v_trial_expires := now() + (p_trial_days || ' days')::interval;
  ELSE
    v_trial_expires := NULL;
  END IF;

  -- Create the store
  INSERT INTO public.stores (name, slug, owner_id, is_active, is_open_manual, trial_expires_at)
  VALUES (TRIM(p_store_name), LOWER(TRIM(p_store_slug)), v_owner_id, true, true, v_trial_expires)
  RETURNING id INTO v_store_id;

  -- If template is specified, populate with template data
  IF p_template_slug IS NOT NULL AND p_template_slug != '' THEN
    SELECT * INTO v_template FROM public.store_templates WHERE slug = p_template_slug;

    IF v_template IS NOT NULL THEN
      -- Create categories
      FOR v_category IN SELECT * FROM jsonb_array_elements(v_template.categories)
      LOOP
        INSERT INTO public.categories (store_id, name, sort_order)
        VALUES (v_store_id, v_category.value->>'name', (v_category.value->>'sort_order')::int)
        RETURNING id INTO v_category_id;

        v_category_map := v_category_map || jsonb_build_object(v_category.value->>'name', v_category_id);
      END LOOP;

      -- Create products
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
$$;
