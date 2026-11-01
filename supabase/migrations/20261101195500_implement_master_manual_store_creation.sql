-- Master-only store creation used by the Super Admin panel.
CREATE OR REPLACE FUNCTION public.create_store_manual(
  p_store_name text, p_store_slug text, p_owner_email text,
  p_trial_days integer DEFAULT 14, p_template_slug text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid; v_store_id uuid; v_template record;
  v_category record; v_product record; v_category_id uuid;
  v_category_map jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.is_master_admin() THEN RAISE EXCEPTION 'Acesso restrito ao administrador master'; END IF;
  IF p_store_name IS NULL OR length(trim(p_store_name)) < 2 THEN RAISE EXCEPTION 'Informe um nome de loja válido'; END IF;
  IF p_store_slug IS NULL OR p_store_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Identificador da loja inválido'; END IF;
  IF p_trial_days IS NULL OR p_trial_days < 0 OR p_trial_days > 365 THEN RAISE EXCEPTION 'Período de teste deve estar entre 0 e 365 dias'; END IF;
  SELECT id INTO v_owner_id FROM public.profiles WHERE lower(email) = lower(trim(p_owner_email)) LIMIT 1;
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Não existe usuário cadastrado com esse e-mail. O responsável deve criar a conta primeiro.'; END IF;
  IF EXISTS (SELECT 1 FROM public.stores WHERE lower(slug) = lower(trim(p_store_slug))) THEN RAISE EXCEPTION 'Este endereço de loja já está em uso'; END IF;
  IF EXISTS (SELECT 1 FROM public.stores WHERE owner_id = v_owner_id) THEN RAISE EXCEPTION 'Este usuário já é proprietário de uma loja'; END IF;
  INSERT INTO public.stores (name, slug, owner_id, is_active, is_open_manual, trial_expires_at)
  VALUES (trim(p_store_name), lower(trim(p_store_slug)), v_owner_id, true, true,
    CASE WHEN p_trial_days = 0 THEN now() ELSE now() + make_interval(days => p_trial_days) END)
  RETURNING id INTO v_store_id;
  IF p_template_slug IS NOT NULL AND p_template_slug <> 'empty' THEN
    SELECT * INTO v_template FROM public.store_templates WHERE slug = p_template_slug;
    IF NOT FOUND THEN RAISE EXCEPTION 'Modelo de loja não encontrado'; END IF;
    FOR v_category IN SELECT * FROM jsonb_array_elements(coalesce(v_template.categories, '[]'::jsonb)) LOOP
      INSERT INTO public.categories (store_id, name, sort_order)
      VALUES (v_store_id, v_category.value->>'name', coalesce((v_category.value->>'sort_order')::int, 0))
      RETURNING id INTO v_category_id;
      v_category_map := v_category_map || jsonb_build_object(v_category.value->>'name', v_category_id);
    END LOOP;
    FOR v_product IN SELECT * FROM jsonb_array_elements(coalesce(v_template.products, '[]'::jsonb)) LOOP
      INSERT INTO public.products (store_id, category_id, name, description, price, is_available, image_url)
      VALUES (v_store_id, (v_category_map->>(v_product.value->>'category'))::uuid,
        v_product.value->>'name', v_product.value->>'description',
        (v_product.value->>'price')::numeric, true, v_product.value->>'image_url');
    END LOOP;
  END IF;
  RETURN v_store_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_store_manual(text,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_manual(text,text,text,integer,text) TO authenticated;
