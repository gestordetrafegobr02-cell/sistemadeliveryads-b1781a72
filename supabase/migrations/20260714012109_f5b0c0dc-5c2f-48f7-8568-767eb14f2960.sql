
-- ---------- Hamburgueria ----------
UPDATE public.store_templates
SET
  name = 'Hamburgueria',
  description = 'Cardápio profissional pronto: combos, smash, artesanais e sobremesas',
  categories = '[
    {"name": "🔥 Destaques", "sort_order": 1},
    {"name": "Combos", "sort_order": 2},
    {"name": "Smash Burgers", "sort_order": 3},
    {"name": "Artesanais", "sort_order": 4},
    {"name": "Acompanhamentos", "sort_order": 5},
    {"name": "Bebidas", "sort_order": 6},
    {"name": "Sobremesas", "sort_order": 7}
  ]'::jsonb,
  products = '[
    {"name": "Smash Duplo Bacon", "description": "2 carnes smash 90g, cheddar cremoso, bacon crocante, cebola caramelizada e molho da casa no pão brioche", "price": 34.90, "category": "🔥 Destaques", "is_featured": true, "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80"},
    {"name": "Combo Executivo", "description": "Cheeseburger + batata rústica média + refrigerante lata 350ml", "price": 39.90, "category": "🔥 Destaques", "is_featured": true, "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1550317138-10000687a72b?w=800&auto=format&fit=crop&q=80"},
    {"name": "Combo Família", "description": "4 burgers artesanais + batata frita grande + 4 refrigerantes lata", "price": 119.90, "category": "Combos", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=800&auto=format&fit=crop&q=80"},
    {"name": "Combo Duo", "description": "2 smash duplo + batata média + 2 refrigerantes", "price": 74.90, "category": "Combos", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop&q=80"},
    {"name": "Smash Single", "description": "Pão brioche, carne smash 90g, queijo americano e cebola caramelizada", "price": 22.90, "category": "Smash Burgers", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80"},
    {"name": "Smash Bacon", "description": "Smash 90g, bacon, cheddar duplo e maionese defumada", "price": 27.90, "category": "Smash Burgers", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&auto=format&fit=crop&q=80"},
    {"name": "Cheeseburger Clássico", "description": "Pão, carne 150g, cheddar, alface, tomate e molho especial", "price": 25.90, "category": "Artesanais", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80"},
    {"name": "Costela BBQ", "description": "Blend 180g de costela, cheddar, cebola crispy e molho barbecue defumado", "price": 32.90, "category": "Artesanais", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1615297928064-24977384d0da?w=800&auto=format&fit=crop&q=80"},
    {"name": "Frango Crispy", "description": "Filé de frango empanado, alface americana, tomate e molho ranch", "price": 26.90, "category": "Artesanais", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&auto=format&fit=crop&q=80"},
    {"name": "Batata Frita Grande", "description": "Porção de batata frita crocante 400g", "price": 18.90, "category": "Acompanhamentos", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&auto=format&fit=crop&q=80"},
    {"name": "Batata Cheddar Bacon", "description": "Batata frita coberta com cheddar cremoso e bacon", "price": 26.90, "category": "Acompanhamentos", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=800&auto=format&fit=crop&q=80"},
    {"name": "Onion Rings", "description": "Anéis de cebola empanados crocantes", "price": 16.90, "category": "Acompanhamentos", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&auto=format&fit=crop&q=80"},
    {"name": "Nuggets 8 un.", "description": "Nuggets crocantes de frango com molhos", "price": 17.90, "category": "Acompanhamentos", "sort_order": 4, "image_url": "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80"},
    {"name": "Coca-Cola Lata", "description": "Refrigerante Coca-Cola 350ml gelado", "price": 6.00, "category": "Bebidas", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&auto=format&fit=crop&q=80"},
    {"name": "Guaraná Antarctica", "description": "Refrigerante Guaraná lata 350ml", "price": 6.00, "category": "Bebidas", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop&q=80"},
    {"name": "Suco Natural Laranja", "description": "Suco de laranja natural 400ml", "price": 9.90, "category": "Bebidas", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&auto=format&fit=crop&q=80"},
    {"name": "Milkshake Ovomaltine", "description": "Milkshake cremoso 400ml com raspas de Ovomaltine", "price": 17.90, "category": "Sobremesas", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80"},
    {"name": "Brownie com Sorvete", "description": "Brownie quente de chocolate belga com sorvete de creme", "price": 16.90, "category": "Sobremesas", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80"}
  ]'::jsonb
WHERE slug = 'burger-shop';

-- ---------- Açaiteria ----------
UPDATE public.store_templates
SET
  name = 'Açaiteria',
  description = 'Cardápio completo: copos, tigelões, adicionais premium e cremes',
  categories = '[
    {"name": "🔥 Destaques", "sort_order": 1},
    {"name": "Copos", "sort_order": 2},
    {"name": "Tigelões", "sort_order": 3},
    {"name": "Adicionais de Frutas", "sort_order": 4},
    {"name": "Cremes e Coberturas", "sort_order": 5},
    {"name": "Complementos Crocantes", "sort_order": 6},
    {"name": "Bebidas", "sort_order": 7}
  ]'::jsonb,
  products = '[
    {"name": "Tigelão da Casa 700ml", "description": "Açaí batido com banana, morango, granola, leite condensado e leite em pó", "price": 32.90, "category": "🔥 Destaques", "is_featured": true, "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&auto=format&fit=crop&q=80"},
    {"name": "Barca do Casal 1L", "description": "Açaí premium com 6 acompanhamentos para 2 pessoas", "price": 49.90, "category": "🔥 Destaques", "is_featured": true, "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1638176067000-9e51de9be99a?w=800&auto=format&fit=crop&q=80"},
    {"name": "Copo 300ml", "description": "Açaí puro com 2 acompanhamentos à sua escolha", "price": 15.90, "category": "Copos", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&auto=format&fit=crop&q=80"},
    {"name": "Copo 500ml", "description": "Açaí puro com 3 acompanhamentos à sua escolha", "price": 22.90, "category": "Copos", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=800&auto=format&fit=crop&q=80"},
    {"name": "Copo 700ml", "description": "Açaí puro com 4 acompanhamentos à sua escolha", "price": 28.90, "category": "Copos", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1600718374662-0483d2b9da44?w=800&auto=format&fit=crop&q=80"},
    {"name": "Tigelão 500ml", "description": "Servido em tigela com 4 acompanhamentos", "price": 24.90, "category": "Tigelões", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=800&auto=format&fit=crop&q=80"},
    {"name": "Tigelão 1 Litro", "description": "Açaí generoso com 5 acompanhamentos - ideal para compartilhar", "price": 42.90, "category": "Tigelões", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1583334513367-b8e2c8e33ad0?w=800&auto=format&fit=crop&q=80"},
    {"name": "Banana", "description": "Banana fresca fatiada", "price": 3.00, "category": "Adicionais de Frutas", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80"},
    {"name": "Morango", "description": "Morangos frescos selecionados", "price": 5.00, "category": "Adicionais de Frutas", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1587393855524-087f83d95c9f?w=800&auto=format&fit=crop&q=80"},
    {"name": "Kiwi", "description": "Kiwi fatiado bem verde", "price": 5.00, "category": "Adicionais de Frutas", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1585059895524-72359e06133a?w=800&auto=format&fit=crop&q=80"},
    {"name": "Manga", "description": "Manga em cubos", "price": 4.00, "category": "Adicionais de Frutas", "sort_order": 4, "image_url": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80"},
    {"name": "Leite Condensado", "description": "Cobertura de leite condensado", "price": 2.50, "category": "Cremes e Coberturas", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1631206753348-db44968fd440?w=800&auto=format&fit=crop&q=80"},
    {"name": "Leite Ninho", "description": "Cobertura de leite em pó Ninho", "price": 3.00, "category": "Cremes e Coberturas", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80"},
    {"name": "Nutella", "description": "Cobertura cremosa de Nutella", "price": 6.00, "category": "Cremes e Coberturas", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1620921586410-16d7b2b1bb96?w=800&auto=format&fit=crop&q=80"},
    {"name": "Ovomaltine", "description": "Cobertura crocante de Ovomaltine", "price": 4.50, "category": "Cremes e Coberturas", "sort_order": 4, "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80"},
    {"name": "Granola", "description": "Granola crocante artesanal", "price": 2.50, "category": "Complementos Crocantes", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=800&auto=format&fit=crop&q=80"},
    {"name": "Paçoca", "description": "Paçoca esfarelada", "price": 2.50, "category": "Complementos Crocantes", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800&auto=format&fit=crop&q=80"},
    {"name": "Bis Triturado", "description": "Chocolate Bis triturado", "price": 3.50, "category": "Complementos Crocantes", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&auto=format&fit=crop&q=80"},
    {"name": "Água Mineral", "description": "Água sem gás 500ml", "price": 4.00, "category": "Bebidas", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&auto=format&fit=crop&q=80"},
    {"name": "Suco Natural Laranja", "description": "Suco de laranja natural 400ml", "price": 9.90, "category": "Bebidas", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&auto=format&fit=crop&q=80"}
  ]'::jsonb
WHERE slug = 'acai-shop';

-- ---------- Pizzaria (NEW) ----------
INSERT INTO public.store_templates (name, slug, description, categories, products) VALUES (
  'Pizzaria',
  'pizza',
  'Cardápio profissional: tradicionais, especiais, doces e bebidas',
  '[
    {"name": "🔥 Destaques", "sort_order": 1},
    {"name": "Pizzas Tradicionais", "sort_order": 2},
    {"name": "Pizzas Especiais", "sort_order": 3},
    {"name": "Pizzas Doces", "sort_order": 4},
    {"name": "Bordas Recheadas", "sort_order": 5},
    {"name": "Bebidas", "sort_order": 6}
  ]'::jsonb,
  '[
    {"name": "Pizza Grande Meio a Meio", "description": "Escolha 2 sabores tradicionais em uma pizza grande de 8 fatias", "price": 55.90, "category": "🔥 Destaques", "is_featured": true, "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80"},
    {"name": "Combo Família", "description": "1 pizza grande + 1 refrigerante 2L + borda recheada de catupiry", "price": 79.90, "category": "🔥 Destaques", "is_featured": true, "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&auto=format&fit=crop&q=80"},
    {"name": "Mussarela", "description": "Molho de tomate artesanal, mussarela derretida, orégano e azeitona preta", "price": 45.90, "category": "Pizzas Tradicionais", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=80"},
    {"name": "Calabresa", "description": "Molho de tomate, mussarela, calabresa fatiada, cebola em rodelas e orégano", "price": 49.90, "category": "Pizzas Tradicionais", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop&q=80"},
    {"name": "Portuguesa", "description": "Mussarela, presunto, ovo, cebola, ervilha, pimentão e azeitona", "price": 52.90, "category": "Pizzas Tradicionais", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&auto=format&fit=crop&q=80"},
    {"name": "Marguerita", "description": "Molho de tomate italiano, mussarela de búfala, tomate cereja e manjericão fresco", "price": 54.90, "category": "Pizzas Tradicionais", "sort_order": 4, "image_url": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&auto=format&fit=crop&q=80"},
    {"name": "Frango com Catupiry", "description": "Frango desfiado temperado, catupiry cremoso, milho e orégano", "price": 54.90, "category": "Pizzas Especiais", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80"},
    {"name": "Quatro Queijos", "description": "Mussarela, gorgonzola, parmesão e catupiry", "price": 59.90, "category": "Pizzas Especiais", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1548369937-47519962c11a?w=800&auto=format&fit=crop&q=80"},
    {"name": "Pepperoni", "description": "Molho de tomate, mussarela e fatias generosas de pepperoni", "price": 58.90, "category": "Pizzas Especiais", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop&q=80"},
    {"name": "Bacon com Cheddar", "description": "Mussarela, bacon crocante, cheddar cremoso e cebola caramelizada", "price": 59.90, "category": "Pizzas Especiais", "sort_order": 4, "image_url": "https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=800&auto=format&fit=crop&q=80"},
    {"name": "Chocolate com Morango", "description": "Chocolate ao leite derretido com morangos frescos", "price": 49.90, "category": "Pizzas Doces", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80"},
    {"name": "Brigadeiro", "description": "Brigadeiro cremoso com granulado de chocolate belga", "price": 49.90, "category": "Pizzas Doces", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1571066811602-716837d681de?w=800&auto=format&fit=crop&q=80"},
    {"name": "Romeu e Julieta", "description": "Mussarela derretida com goiabada cremosa", "price": 47.90, "category": "Pizzas Doces", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=800&auto=format&fit=crop&q=80"},
    {"name": "Borda de Catupiry", "description": "Adicional de borda recheada com catupiry cremoso", "price": 8.00, "category": "Bordas Recheadas", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=800&auto=format&fit=crop&q=80"},
    {"name": "Borda de Cheddar", "description": "Adicional de borda recheada com cheddar", "price": 8.00, "category": "Bordas Recheadas", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=800&auto=format&fit=crop&q=80"},
    {"name": "Borda de Chocolate", "description": "Adicional de borda recheada com chocolate", "price": 10.00, "category": "Bordas Recheadas", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1585828922344-85c9daa264b0?w=800&auto=format&fit=crop&q=80"},
    {"name": "Coca-Cola 2L", "description": "Refrigerante Coca-Cola 2 litros gelado", "price": 14.90, "category": "Bebidas", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&auto=format&fit=crop&q=80"},
    {"name": "Guaraná Antarctica 2L", "description": "Refrigerante Guaraná Antarctica 2 litros", "price": 12.90, "category": "Bebidas", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop&q=80"},
    {"name": "Suco Natural 500ml", "description": "Suco natural de laranja, maracujá ou abacaxi", "price": 11.90, "category": "Bebidas", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&auto=format&fit=crop&q=80"},
    {"name": "Água Mineral", "description": "Água mineral sem gás 500ml", "price": 4.00, "category": "Bebidas", "sort_order": 4, "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&auto=format&fit=crop&q=80"}
  ]'::jsonb
) ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    categories = EXCLUDED.categories,
    products = EXCLUDED.products;

-- Upgrade RPC to also honor is_featured and sort_order
CREATE OR REPLACE FUNCTION public.create_user_store_with_template(
  p_store_name text, p_store_slug text, p_template_slug text DEFAULT NULL::text
)
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.stores WHERE owner_id = v_user_id) THEN
    RAISE EXCEPTION 'User already has a store';
  END IF;
  IF p_store_name IS NULL OR TRIM(p_store_name) = '' THEN RAISE EXCEPTION 'Store name is required'; END IF;
  IF p_store_slug IS NULL OR TRIM(p_store_slug) = '' THEN RAISE EXCEPTION 'Store slug is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.stores WHERE LOWER(slug) = LOWER(p_store_slug)) THEN
    RAISE EXCEPTION 'Slug already in use';
  END IF;

  INSERT INTO public.stores (name, slug, owner_id, is_active, is_open_manual)
  VALUES (TRIM(p_store_name), LOWER(TRIM(p_store_slug)), v_user_id, true, true)
  RETURNING id INTO v_store_id;

  IF p_template_slug IS NOT NULL AND p_template_slug != 'empty' THEN
    SELECT * INTO v_template FROM public.store_templates WHERE slug = p_template_slug;
    IF v_template IS NOT NULL THEN
      FOR v_category IN SELECT * FROM jsonb_array_elements(v_template.categories) LOOP
        INSERT INTO public.categories (store_id, name, sort_order)
        VALUES (v_store_id, v_category.value->>'name', (v_category.value->>'sort_order')::int)
        RETURNING id INTO v_category_id;
        v_category_map := v_category_map || jsonb_build_object(v_category.value->>'name', v_category_id);
      END LOOP;

      FOR v_product IN SELECT * FROM jsonb_array_elements(v_template.products) LOOP
        INSERT INTO public.products (
          store_id, category_id, name, description, price,
          is_available, is_featured, sort_order, image_url
        )
        VALUES (
          v_store_id,
          (v_category_map->>(v_product.value->>'category'))::uuid,
          v_product.value->>'name',
          v_product.value->>'description',
          (v_product.value->>'price')::numeric,
          true,
          COALESCE((v_product.value->>'is_featured')::boolean, false),
          COALESCE((v_product.value->>'sort_order')::int, 0),
          NULLIF(v_product.value->>'image_url', '')
        );
      END LOOP;
    END IF;
  END IF;

  RETURN v_store_id;
END;
$function$;
