-- Remove unique constraint on owner_id to allow demo stores
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_owner_id_key;

-- Create demo stores using master admin as owner
INSERT INTO public.stores (id, name, slug, owner_id, is_active, is_open_manual, trial_expires_at, whatsapp, pix_key, delivery_fee)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Demo Hamburgueria', 'demo-hamburgueria', '60a048a7-7ba6-452c-a6cd-df443ce62291', true, true, '2099-12-31 23:59:59+00', '11999999999', 'demo@pix.com', 5.00),
  ('22222222-2222-2222-2222-222222222222', 'Demo Pizzaria', 'demo-pizzaria', '60a048a7-7ba6-452c-a6cd-df443ce62291', true, true, '2099-12-31 23:59:59+00', '11999999999', 'demo@pix.com', 8.00),
  ('33333333-3333-3333-3333-333333333333', 'Demo Açaiteria', 'demo-acaiteria', '60a048a7-7ba6-452c-a6cd-df443ce62291', true, true, '2099-12-31 23:59:59+00', '11999999999', 'demo@pix.com', 5.00),
  ('44444444-4444-4444-4444-444444444444', 'Demo Hortifruti', 'demo-hortifruti', '60a048a7-7ba6-452c-a6cd-df443ce62291', true, true, '2099-12-31 23:59:59+00', '11999999999', 'demo@pix.com', 6.00)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = true,
  is_open_manual = true,
  trial_expires_at = '2099-12-31 23:59:59+00';

-- =====================
-- HAMBURGUERIA CATEGORIES
-- =====================
INSERT INTO public.categories (id, name, store_id, sort_order)
VALUES 
  ('aaaa0001-0001-0001-0001-000000000001', 'Burgers', '11111111-1111-1111-1111-111111111111', 1),
  ('aaaa0001-0001-0001-0001-000000000002', 'Combos', '11111111-1111-1111-1111-111111111111', 2),
  ('aaaa0001-0001-0001-0001-000000000003', 'Acompanhamentos', '11111111-1111-1111-1111-111111111111', 3),
  ('aaaa0001-0001-0001-0001-000000000004', 'Bebidas', '11111111-1111-1111-1111-111111111111', 4)
ON CONFLICT (id) DO NOTHING;

-- HAMBURGUERIA PRODUCTS
INSERT INTO public.products (id, name, description, price, store_id, category_id, is_available, is_featured, sort_order)
VALUES 
  ('bbbb0001-0001-0001-0001-000000000001', 'Smash Burger Clássico', 'Pão brioche, blend 120g, queijo cheddar, cebola caramelizada e molho especial', 28.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', true, true, 1),
  ('bbbb0001-0001-0001-0001-000000000002', 'Smash Bacon', 'Pão brioche, blend 120g, bacon crocante, queijo cheddar e molho barbecue', 32.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', true, true, 2),
  ('bbbb0001-0001-0001-0001-000000000003', 'Duplo Smash', 'Pão brioche, 2x blend 120g, queijo cheddar duplo, picles e molho especial', 38.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', true, false, 3),
  ('bbbb0001-0001-0001-0001-000000000004', 'Veggie Burger', 'Pão integral, hambúrguer de grão de bico, alface, tomate e maionese vegana', 26.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', true, false, 4),
  ('bbbb0001-0001-0001-0001-000000000005', 'Combo Smash Clássico', 'Smash Burger + Batata Frita + Refrigerante 350ml', 42.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', true, true, 1),
  ('bbbb0001-0001-0001-0001-000000000006', 'Combo Duplo', 'Duplo Smash + Batata Frita Grande + Refrigerante 500ml', 52.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', true, false, 2),
  ('bbbb0001-0001-0001-0001-000000000007', 'Batata Frita', 'Porção de batata frita crocante (200g)', 14.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000003', true, false, 1),
  ('bbbb0001-0001-0001-0001-000000000008', 'Onion Rings', 'Anéis de cebola empanados (8 unidades)', 16.90, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000003', true, false, 2),
  ('bbbb0001-0001-0001-0001-000000000009', 'Coca-Cola 350ml', 'Refrigerante lata', 6.00, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000004', true, false, 1),
  ('bbbb0001-0001-0001-0001-000000000010', 'Guaraná Antarctica 350ml', 'Refrigerante lata', 6.00, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000004', true, false, 2),
  ('bbbb0001-0001-0001-0001-000000000011', 'Água Mineral 500ml', 'Água sem gás', 4.00, '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000004', true, false, 3)
ON CONFLICT (id) DO NOTHING;

-- HAMBURGUERIA MODIFIERS
INSERT INTO public.product_modifiers (id, name, price, product_id, is_available, sort_order)
VALUES 
  ('cccc0001-0001-0001-0001-000000000001', 'Adicionar Bacon', 5.00, 'bbbb0001-0001-0001-0001-000000000001', true, 1),
  ('cccc0001-0001-0001-0001-000000000002', 'Adicionar Ovo', 3.00, 'bbbb0001-0001-0001-0001-000000000001', true, 2),
  ('cccc0001-0001-0001-0001-000000000003', 'Queijo Extra', 4.00, 'bbbb0001-0001-0001-0001-000000000001', true, 3),
  ('cccc0001-0001-0001-0001-000000000004', 'Adicionar Bacon', 5.00, 'bbbb0001-0001-0001-0001-000000000003', true, 1),
  ('cccc0001-0001-0001-0001-000000000005', 'Blend Extra', 12.00, 'bbbb0001-0001-0001-0001-000000000003', true, 2)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- PIZZARIA CATEGORIES
-- =====================
INSERT INTO public.categories (id, name, store_id, sort_order)
VALUES 
  ('aaaa0002-0002-0002-0002-000000000001', 'Pizzas Tradicionais', '22222222-2222-2222-2222-222222222222', 1),
  ('aaaa0002-0002-0002-0002-000000000002', 'Pizzas Especiais', '22222222-2222-2222-2222-222222222222', 2),
  ('aaaa0002-0002-0002-0002-000000000003', 'Pizzas Doces', '22222222-2222-2222-2222-222222222222', 3),
  ('aaaa0002-0002-0002-0002-000000000004', 'Bebidas', '22222222-2222-2222-2222-222222222222', 4)
ON CONFLICT (id) DO NOTHING;

-- PIZZARIA PRODUCTS
INSERT INTO public.products (id, name, description, price, store_id, category_id, is_available, is_featured, sort_order)
VALUES 
  ('bbbb0002-0002-0002-0002-000000000001', 'Margherita', 'Molho de tomate, mussarela, tomate e manjericão fresco', 45.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000001', true, true, 1),
  ('bbbb0002-0002-0002-0002-000000000002', 'Calabresa', 'Molho de tomate, mussarela, calabresa fatiada e cebola', 42.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000001', true, false, 2),
  ('bbbb0002-0002-0002-0002-000000000003', 'Portuguesa', 'Molho de tomate, mussarela, presunto, ovos, cebola, azeitona e ervilha', 48.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000001', true, true, 3),
  ('bbbb0002-0002-0002-0002-000000000004', 'Frango com Catupiry', 'Molho de tomate, mussarela, frango desfiado e catupiry', 49.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000002', true, true, 1),
  ('bbbb0002-0002-0002-0002-000000000005', 'Quatro Queijos', 'Molho de tomate, mussarela, provolone, gorgonzola e parmesão', 52.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000002', true, false, 2),
  ('bbbb0002-0002-0002-0002-000000000006', 'Pepperoni', 'Molho de tomate, mussarela e pepperoni', 54.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000002', true, false, 3),
  ('bbbb0002-0002-0002-0002-000000000007', 'Chocolate com Morango', 'Chocolate ao leite e morangos frescos', 38.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000003', true, false, 1),
  ('bbbb0002-0002-0002-0002-000000000008', 'Banana com Canela', 'Banana, açúcar, canela e leite condensado', 36.90, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000003', true, false, 2),
  ('bbbb0002-0002-0002-0002-000000000009', 'Refrigerante 2L', 'Coca-Cola, Guaraná ou Fanta', 12.00, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000004', true, false, 1),
  ('bbbb0002-0002-0002-0002-000000000010', 'Suco Natural 500ml', 'Laranja, Limão ou Maracujá', 10.00, '22222222-2222-2222-2222-222222222222', 'aaaa0002-0002-0002-0002-000000000004', true, false, 2)
ON CONFLICT (id) DO NOTHING;

-- PIZZARIA MODIFIERS (Bordas)
INSERT INTO public.product_modifiers (id, name, price, product_id, is_available, sort_order)
VALUES 
  ('cccc0002-0002-0002-0002-000000000001', 'Borda Catupiry', 8.00, 'bbbb0002-0002-0002-0002-000000000001', true, 1),
  ('cccc0002-0002-0002-0002-000000000002', 'Borda Cheddar', 8.00, 'bbbb0002-0002-0002-0002-000000000001', true, 2),
  ('cccc0002-0002-0002-0002-000000000003', 'Borda Chocolate', 10.00, 'bbbb0002-0002-0002-0002-000000000001', true, 3),
  ('cccc0002-0002-0002-0002-000000000004', 'Borda Catupiry', 8.00, 'bbbb0002-0002-0002-0002-000000000004', true, 1),
  ('cccc0002-0002-0002-0002-000000000005', 'Borda Cheddar', 8.00, 'bbbb0002-0002-0002-0002-000000000004', true, 2)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- AÇAITERIA CATEGORIES
-- =====================
INSERT INTO public.categories (id, name, store_id, sort_order)
VALUES 
  ('aaaa0003-0003-0003-0003-000000000001', 'Açaí no Copo', '33333333-3333-3333-3333-333333333333', 1),
  ('aaaa0003-0003-0003-0003-000000000002', 'Açaí na Tigela', '33333333-3333-3333-3333-333333333333', 2),
  ('aaaa0003-0003-0003-0003-000000000003', 'Vitaminas', '33333333-3333-3333-3333-333333333333', 3),
  ('aaaa0003-0003-0003-0003-000000000004', 'Complementos Avulsos', '33333333-3333-3333-3333-333333333333', 4)
ON CONFLICT (id) DO NOTHING;

-- AÇAITERIA PRODUCTS
INSERT INTO public.products (id, name, description, price, store_id, category_id, is_available, is_featured, sort_order)
VALUES 
  ('bbbb0003-0003-0003-0003-000000000001', 'Açaí 300ml', 'Açaí puro batido com guaraná', 14.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000001', true, false, 1),
  ('bbbb0003-0003-0003-0003-000000000002', 'Açaí 500ml', 'Açaí puro batido com guaraná', 22.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000001', true, true, 2),
  ('bbbb0003-0003-0003-0003-000000000003', 'Açaí 700ml', 'Açaí puro batido com guaraná', 28.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000001', true, true, 3),
  ('bbbb0003-0003-0003-0003-000000000004', 'Tigela Tradicional', 'Açaí, granola, banana e mel', 24.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000002', true, true, 1),
  ('bbbb0003-0003-0003-0003-000000000005', 'Tigela Tropical', 'Açaí, granola, morango, kiwi e leite condensado', 29.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000002', true, false, 2),
  ('bbbb0003-0003-0003-0003-000000000006', 'Tigela Fit', 'Açaí, chia, banana, mel e castanhas', 32.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000002', true, false, 3),
  ('bbbb0003-0003-0003-0003-000000000007', 'Vitamina de Açaí', 'Açaí batido com banana e leite', 16.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000003', true, false, 1),
  ('bbbb0003-0003-0003-0003-000000000008', 'Vitamina Energética', 'Açaí, banana, aveia e mel', 18.90, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000003', true, false, 2),
  ('bbbb0003-0003-0003-0003-000000000009', 'Granola Extra', 'Porção adicional de granola', 3.00, '33333333-3333-3333-3333-333333333333', 'aaaa0003-0003-0003-0003-000000000004', true, false, 1)
ON CONFLICT (id) DO NOTHING;

-- AÇAITERIA MODIFIERS (Multiple toppings)
INSERT INTO public.product_modifiers (id, name, price, product_id, is_available, sort_order)
VALUES 
  ('cccc0003-0003-0003-0003-000000000001', 'Granola', 2.00, 'bbbb0003-0003-0003-0003-000000000002', true, 1),
  ('cccc0003-0003-0003-0003-000000000002', 'Banana', 2.00, 'bbbb0003-0003-0003-0003-000000000002', true, 2),
  ('cccc0003-0003-0003-0003-000000000003', 'Morango', 3.00, 'bbbb0003-0003-0003-0003-000000000002', true, 3),
  ('cccc0003-0003-0003-0003-000000000004', 'Leite Condensado', 2.50, 'bbbb0003-0003-0003-0003-000000000002', true, 4),
  ('cccc0003-0003-0003-0003-000000000005', 'Mel', 2.00, 'bbbb0003-0003-0003-0003-000000000002', true, 5),
  ('cccc0003-0003-0003-0003-000000000006', 'Paçoca', 2.50, 'bbbb0003-0003-0003-0003-000000000002', true, 6),
  ('cccc0003-0003-0003-0003-000000000007', 'Nutella', 5.00, 'bbbb0003-0003-0003-0003-000000000002', true, 7),
  ('cccc0003-0003-0003-0003-000000000008', 'Leite em Pó', 2.00, 'bbbb0003-0003-0003-0003-000000000002', true, 8),
  ('cccc0003-0003-0003-0003-000000000009', 'Granola', 2.00, 'bbbb0003-0003-0003-0003-000000000003', true, 1),
  ('cccc0003-0003-0003-0003-000000000010', 'Banana', 2.00, 'bbbb0003-0003-0003-0003-000000000003', true, 2),
  ('cccc0003-0003-0003-0003-000000000011', 'Morango', 3.00, 'bbbb0003-0003-0003-0003-000000000003', true, 3),
  ('cccc0003-0003-0003-0003-000000000012', 'Leite Condensado', 2.50, 'bbbb0003-0003-0003-0003-000000000003', true, 4),
  ('cccc0003-0003-0003-0003-000000000013', 'Nutella', 5.00, 'bbbb0003-0003-0003-0003-000000000003', true, 5)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- HORTIFRUTI CATEGORIES
-- =====================
INSERT INTO public.categories (id, name, store_id, sort_order)
VALUES 
  ('aaaa0004-0004-0004-0004-000000000001', 'Frutas', '44444444-4444-4444-4444-444444444444', 1),
  ('aaaa0004-0004-0004-0004-000000000002', 'Verduras', '44444444-4444-4444-4444-444444444444', 2),
  ('aaaa0004-0004-0004-0004-000000000003', 'Legumes', '44444444-4444-4444-4444-444444444444', 3),
  ('aaaa0004-0004-0004-0004-000000000004', 'Orgânicos', '44444444-4444-4444-4444-444444444444', 4)
ON CONFLICT (id) DO NOTHING;

-- HORTIFRUTI PRODUCTS
INSERT INTO public.products (id, name, description, price, store_id, category_id, is_available, is_featured, sort_order)
VALUES 
  ('bbbb0004-0004-0004-0004-000000000001', 'Banana Prata', 'Preço por KG - Banana madura e doce', 6.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000001', true, true, 1),
  ('bbbb0004-0004-0004-0004-000000000002', 'Maçã Fuji', 'Preço por KG - Maçã crocante e suculenta', 12.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000001', true, false, 2),
  ('bbbb0004-0004-0004-0004-000000000003', 'Laranja Pera', 'Preço por KG - Ideal para suco', 5.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000001', true, true, 3),
  ('bbbb0004-0004-0004-0004-000000000004', 'Morango', 'Bandeja 300g - Morangos frescos', 14.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000001', true, false, 4),
  ('bbbb0004-0004-0004-0004-000000000005', 'Alface Crespa', 'Unidade - Alface fresca e crocante', 4.50, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000002', true, false, 1),
  ('bbbb0004-0004-0004-0004-000000000006', 'Couve Manteiga', 'Maço - Folhas verdes e nutritivas', 5.00, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000002', true, false, 2),
  ('bbbb0004-0004-0004-0004-000000000007', 'Rúcula', 'Maço - Sabor marcante para saladas', 6.00, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000002', true, false, 3),
  ('bbbb0004-0004-0004-0004-000000000008', 'Tomate Italiano', 'Preço por KG - Tomate carnudo', 9.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000003', true, true, 1),
  ('bbbb0004-0004-0004-0004-000000000009', 'Cenoura', 'Preço por KG - Cenoura fresca', 6.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000003', true, false, 2),
  ('bbbb0004-0004-0004-0004-000000000010', 'Batata', 'Preço por KG - Batata para qualquer receita', 7.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000003', true, false, 3),
  ('bbbb0004-0004-0004-0004-000000000011', 'Cebola', 'Preço por KG - Cebola branca', 5.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000003', true, false, 4),
  ('bbbb0004-0004-0004-0004-000000000012', 'Kit Salada Orgânica', 'Alface, tomate e pepino orgânicos', 18.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000004', true, true, 1),
  ('bbbb0004-0004-0004-0004-000000000013', 'Ovos Orgânicos', 'Dúzia - Ovos caipiras orgânicos', 24.90, '44444444-4444-4444-4444-444444444444', 'aaaa0004-0004-0004-0004-000000000004', true, false, 2)
ON CONFLICT (id) DO NOTHING;