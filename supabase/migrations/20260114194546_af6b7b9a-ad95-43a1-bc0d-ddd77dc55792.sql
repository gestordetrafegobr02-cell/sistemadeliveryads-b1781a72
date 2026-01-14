-- Add is_active column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create a function to check if user is the master admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'igormoises.ads@gmail.com',
    false
  )
$$;

-- Update RLS policy for stores to allow master admin full control
DROP POLICY IF EXISTS "Master admin full access" ON public.stores;
CREATE POLICY "Master admin full access"
ON public.stores
FOR ALL
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- Create store templates table for storing niche templates
CREATE TABLE IF NOT EXISTS public.store_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on store_templates
ALTER TABLE public.store_templates ENABLE ROW LEVEL SECURITY;

-- Only master admin can manage templates
CREATE POLICY "Master admin can manage templates"
ON public.store_templates
FOR ALL
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- Insert predefined templates
INSERT INTO public.store_templates (name, slug, description, categories, products) VALUES
(
  'Hamburgueria',
  'burger-shop',
  'Template para lanchonetes e hamburguerias',
  '[
    {"name": "Combos", "sort_order": 1},
    {"name": "Hambúrgueres Artesanais", "sort_order": 2},
    {"name": "Smash Burgers", "sort_order": 3},
    {"name": "Acompanhamentos", "sort_order": 4},
    {"name": "Bebidas", "sort_order": 5},
    {"name": "Sobremesas", "sort_order": 6}
  ]'::jsonb,
  '[
    {"name": "Cheeseburger Clássico", "description": "Pão, carne 150g, queijo cheddar, alface, tomate e molho especial", "price": 25.90, "category": "Hambúrgueres Artesanais"},
    {"name": "Double Bacon", "description": "Pão, 2x carne 150g, bacon crocante, queijo e molho barbecue", "price": 35.90, "category": "Hambúrgueres Artesanais"},
    {"name": "Smash Single", "description": "Pão brioche, carne smash 90g, queijo americano e cebola caramelizada", "price": 22.90, "category": "Smash Burgers"},
    {"name": "Combo Família", "description": "4 Burgers + Batata Grande + 4 Refrigerantes", "price": 99.90, "category": "Combos"},
    {"name": "Batata Frita Grande", "description": "Porção de batata frita crocante 400g", "price": 18.90, "category": "Acompanhamentos"},
    {"name": "Onion Rings", "description": "Anéis de cebola empanados", "price": 16.90, "category": "Acompanhamentos"},
    {"name": "Refrigerante Lata", "description": "Coca-Cola, Guaraná ou Fanta 350ml", "price": 6.00, "category": "Bebidas"},
    {"name": "Milkshake", "description": "Chocolate, Morango ou Ovomaltine 400ml", "price": 15.90, "category": "Bebidas"},
    {"name": "Brownie com Sorvete", "description": "Brownie de chocolate com sorvete de creme", "price": 14.90, "category": "Sobremesas"}
  ]'::jsonb
),
(
  'Açaiteria',
  'acai-shop',
  'Template para açaiterias e sorveterias',
  '[
    {"name": "Tigelas Personalizadas", "sort_order": 1},
    {"name": "Açaí por Peso", "sort_order": 2},
    {"name": "Toppings de Frutas", "sort_order": 3},
    {"name": "Cremes e Coberturas", "sort_order": 4},
    {"name": "Bebidas", "sort_order": 5}
  ]'::jsonb,
  '[
    {"name": "Tigela 300ml", "description": "Açaí puro com 2 acompanhamentos inclusos", "price": 15.90, "category": "Tigelas Personalizadas"},
    {"name": "Tigela 500ml", "description": "Açaí puro com 3 acompanhamentos inclusos", "price": 22.90, "category": "Tigelas Personalizadas"},
    {"name": "Tigela 700ml", "description": "Açaí puro com 4 acompanhamentos inclusos", "price": 28.90, "category": "Tigelas Personalizadas"},
    {"name": "Barca de Açaí", "description": "Açaí 1L com todos os toppings para compartilhar", "price": 45.90, "category": "Tigelas Personalizadas"},
    {"name": "Açaí 100g", "description": "Preço por 100g no self-service", "price": 8.90, "category": "Açaí por Peso"},
    {"name": "Banana", "description": "Topping de banana fatiada", "price": 3.00, "category": "Toppings de Frutas"},
    {"name": "Morango", "description": "Topping de morango fresco", "price": 4.00, "category": "Toppings de Frutas"},
    {"name": "Leite Condensado", "description": "Cobertura de leite condensado", "price": 2.50, "category": "Cremes e Coberturas"},
    {"name": "Leite em Pó", "description": "Cobertura de leite ninho", "price": 3.00, "category": "Cremes e Coberturas"},
    {"name": "Água Mineral", "description": "Água sem gás 500ml", "price": 4.00, "category": "Bebidas"}
  ]'::jsonb
),
(
  'Restaurante',
  'restaurant',
  'Template para restaurantes com pratos executivos',
  '[
    {"name": "Pratos do Dia", "sort_order": 1},
    {"name": "Pratos Executivos", "sort_order": 2},
    {"name": "Porções Extras", "sort_order": 3},
    {"name": "Bebidas", "sort_order": 4}
  ]'::jsonb,
  '[
    {"name": "Prato do Dia - Segunda", "description": "Bife acebolado com arroz, feijão e salada", "price": 25.90, "category": "Pratos do Dia"},
    {"name": "Prato do Dia - Terça", "description": "Frango grelhado com purê e legumes", "price": 25.90, "category": "Pratos do Dia"},
    {"name": "Prato do Dia - Quarta", "description": "Feijoada completa com acompanhamentos", "price": 29.90, "category": "Pratos do Dia"},
    {"name": "Executivo Carne", "description": "Carne grelhada com arroz, feijão, batata e salada", "price": 32.90, "category": "Pratos Executivos"},
    {"name": "Executivo Frango", "description": "Peito de frango grelhado com arroz, feijão e salada", "price": 28.90, "category": "Pratos Executivos"},
    {"name": "Executivo Peixe", "description": "Filé de tilápia grelhado com arroz e legumes", "price": 34.90, "category": "Pratos Executivos"},
    {"name": "Arroz Extra", "description": "Porção adicional de arroz branco", "price": 6.00, "category": "Porções Extras"},
    {"name": "Feijão Extra", "description": "Porção adicional de feijão", "price": 6.00, "category": "Porções Extras"},
    {"name": "Suco Natural", "description": "Laranja, limão ou maracujá 300ml", "price": 8.00, "category": "Bebidas"},
    {"name": "Refrigerante", "description": "Lata 350ml", "price": 6.00, "category": "Bebidas"}
  ]'::jsonb
),
(
  'Hortifruti',
  'grocery',
  'Template para mercadinhos e hortifruti',
  '[
    {"name": "Frutas", "sort_order": 1},
    {"name": "Legumes", "sort_order": 2},
    {"name": "Verduras", "sort_order": 3},
    {"name": "Laticínios e Ovos", "sort_order": 4},
    {"name": "Mercearia", "sort_order": 5}
  ]'::jsonb,
  '[
    {"name": "Banana Prata (kg)", "description": "Banana prata fresca por quilo", "price": 6.99, "category": "Frutas"},
    {"name": "Maçã Fuji (kg)", "description": "Maçã fuji selecionada por quilo", "price": 9.99, "category": "Frutas"},
    {"name": "Laranja Pera (kg)", "description": "Laranja pera para suco por quilo", "price": 5.99, "category": "Frutas"},
    {"name": "Tomate Italiano (kg)", "description": "Tomate italiano maduro por quilo", "price": 8.99, "category": "Legumes"},
    {"name": "Batata Inglesa (kg)", "description": "Batata inglesa lavada por quilo", "price": 5.99, "category": "Legumes"},
    {"name": "Cebola (kg)", "description": "Cebola branca por quilo", "price": 4.99, "category": "Legumes"},
    {"name": "Alface Americana", "description": "Unidade", "price": 4.99, "category": "Verduras"},
    {"name": "Couve Manteiga", "description": "Maço", "price": 3.99, "category": "Verduras"},
    {"name": "Ovos Brancos Dúzia", "description": "12 ovos brancos grandes", "price": 12.99, "category": "Laticínios e Ovos"},
    {"name": "Leite Integral 1L", "description": "Leite integral de caixinha", "price": 5.49, "category": "Laticínios e Ovos"},
    {"name": "Arroz 5kg", "description": "Arroz branco tipo 1", "price": 24.99, "category": "Mercearia"},
    {"name": "Feijão Carioca 1kg", "description": "Feijão carioca tipo 1", "price": 8.99, "category": "Mercearia"}
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Function to create a store from template
CREATE OR REPLACE FUNCTION public.create_store_from_template(
  p_template_slug text,
  p_store_name text,
  p_store_slug text,
  p_owner_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template record;
  v_store_id uuid;
  v_category record;
  v_product record;
  v_category_id uuid;
  v_category_map jsonb := '{}'::jsonb;
BEGIN
  -- Only master admin can execute this
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Master admin access required';
  END IF;

  -- Get template
  SELECT * INTO v_template FROM public.store_templates WHERE slug = p_template_slug;
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Create the store
  INSERT INTO public.stores (name, slug, owner_id, is_active)
  VALUES (p_store_name, p_store_slug, p_owner_id, true)
  RETURNING id INTO v_store_id;

  -- Create categories and map names to IDs
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
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (
      v_store_id,
      (v_category_map->>(v_product.value->>'category'))::uuid,
      v_product.value->>'name',
      v_product.value->>'description',
      (v_product.value->>'price')::numeric,
      true
    );
  END LOOP;

  RETURN v_store_id;
END;
$$;

-- Function to toggle store active status
CREATE OR REPLACE FUNCTION public.toggle_store_active(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status boolean;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Master admin access required';
  END IF;

  UPDATE public.stores 
  SET is_active = NOT is_active, updated_at = now()
  WHERE id = p_store_id
  RETURNING is_active INTO v_new_status;

  RETURN v_new_status;
END;
$$;

-- Function to delete a store completely
CREATE OR REPLACE FUNCTION public.delete_store_master(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Master admin access required';
  END IF;

  -- Delete products first
  DELETE FROM public.products WHERE store_id = p_store_id;
  
  -- Delete categories
  DELETE FROM public.categories WHERE store_id = p_store_id;
  
  -- Delete orders
  DELETE FROM public.orders WHERE store_id = p_store_id;
  
  -- Delete the store
  DELETE FROM public.stores WHERE id = p_store_id;

  RETURN true;
END;
$$;

-- Update stores_public view to include is_active
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  opening_hours,
  is_open_manual,
  delivery_fee,
  is_active,
  created_at,
  updated_at
FROM public.stores
WHERE is_active = true;