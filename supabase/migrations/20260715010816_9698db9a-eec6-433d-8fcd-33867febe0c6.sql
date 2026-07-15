
CREATE TABLE public.menu_image_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(url)
);

GRANT SELECT ON public.menu_image_bank TO authenticated, anon;
GRANT ALL ON public.menu_image_bank TO service_role;

ALTER TABLE public.menu_image_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all" ON public.menu_image_bank FOR SELECT USING (true);
CREATE POLICY "master_write" ON public.menu_image_bank FOR ALL
  USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());

CREATE INDEX idx_menu_image_bank_category ON public.menu_image_bank(category, sort_order);

-- Seed com imagens coletadas das lojas
INSERT INTO public.menu_image_bank (category, name, url, sort_order) VALUES
-- Hambúrgueres
('burgers', 'Ó Pai Ó', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80', 1),
('burgers', 'Avexado', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', 2),
('burgers', 'Só o Básico', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&auto=format&fit=crop&q=80', 3),
('burgers', 'Oxe', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80', 4),
('burgers', 'Misto Completo', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779989861096_kwept4vg.jpg', 5),
('burgers', 'X Burguer', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779989957087_s47f3cn3.jpg', 6),
('burgers', 'Americano', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779990023490_pd31kwt1.jpg', 7),
('burgers', 'Burguer de Frango', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779990070189_khi1wb6k.jpg', 8),
('burgers', 'Lá Ele', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991134750_1im7r7ns.jpg', 9),
('burgers', 'X Egg Bacon', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991176415_lrh411wn.jpg', 10),
('burgers', 'Especial da Casa', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991212744_eaj9hf1q.jpg', 11),
('burgers', 'Mega Burguer', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991247938_q7rpklna.jpg', 12),
('burgers', 'Especial Burguer', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991265280_cnujx1y5.jpg', 13),
('burgers', 'X Tudo', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991287254_eq45vpjo.webp', 14),
('burgers', 'Barril Dobrado', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991324138_n1bhrbvm.jpg', 15),
('burgers', 'Brocar', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991346734_fhro5rmf.jpg', 16),
-- Acompanhamentos
('sides', 'Batata Frita', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', 1),
('sides', 'Batata com Cheddar e Bacon', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991031924_1lcnyfdg.jpg', 2),
-- Bebidas
('drinks', 'Suco Natural de Laranja', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80', 1),
('drinks', 'Coca-Cola Lata', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', 2),
('drinks', 'Guaraná Antarctica Lata', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991072671_fycgxjk0.jpg', 3),
('drinks', 'Coca-Cola 1L', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991377462_8cye7bvb.jpg', 4),
('drinks', 'Guaraná 1L', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991412110_yuq3qnfs.jpg', 5),
('drinks', 'Guaraná 350ml', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991442497_2bpwaow9.jpg', 6),
('drinks', 'Água Mineral', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991470584_wgr6d6gp.jpg', 7),
('drinks', 'H2O', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991500212_r8lnel5z.jpg', 8),
('drinks', 'Cerveja Lata', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991540056_idpnt9he.jpg', 9),
('drinks', 'Heineken 330ml', 'https://rxmjjuhibcvqzidgidxp.supabase.co/storage/v1/object/public/store-assets/ff3c305c-bc47-4aa1-a933-a612e21594c1/products/1779991568915_yuy4cj15.jpg', 10),
-- Açaí
('acai', 'Açaí Tradicional 200ml', '/__l5e/assets-v1/c129832d-024a-480c-a3ea-2cec03c32a78/acai-tradicional.jpg', 1),
('acai', 'Açaí com Creme', '/__l5e/assets-v1/e05c556e-489f-42f5-842a-97c6a2105267/acai-creme.jpg', 2),
('acai', 'Açaí com Morango', '/__l5e/assets-v1/96b5399f-5ab2-45a4-bb61-1ec60f192bd6/acai-morango.jpg', 3),
('acai', 'Açaí com Frutas', '/__l5e/assets-v1/bca769e3-8642-40a5-836c-4c0b69de0ef9/acai-frutas.jpg', 4),
('acai', 'Açaí Negresco', '/__l5e/assets-v1/aff6b152-6948-4a8b-9397-a0d6f89dcccc/acai-negresco.jpg', 5),
('acai', 'Açaí Gourmet', '/__l5e/assets-v1/63977d21-1ce3-40b1-bf11-e618b29fa271/acai-gourmet.jpg', 6),
('acai', 'Açaí 1 Litro', '/__l5e/assets-v1/909016c9-853f-40d7-a0b3-1ff595b86095/acai-1litro.jpg', 7),
('acai', 'Vitamina de Açaí', '/__l5e/assets-v1/8740e30f-305a-4f98-9fa5-b9ba9416dfcc/vitamina.jpg', 8),
-- Milk-shake
('milkshakes', 'Milk-shake', '/__l5e/assets-v1/27bc0e77-4e34-4b7a-961d-ce590acd8248/milkshake.jpg', 1),
-- Sorvetes
('sorvetes', 'Pote de Sorvete 1kg', '/__l5e/assets-v1/ad387fc0-492e-4b3d-9715-ce8d01002390/pote-sorvete.jpg', 1);
