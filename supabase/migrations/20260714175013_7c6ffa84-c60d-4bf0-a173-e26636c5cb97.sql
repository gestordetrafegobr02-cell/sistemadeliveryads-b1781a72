
UPDATE public.products SET image_url = CASE
  -- Açaí flavors (Copos + 1L)
  WHEN name ILIKE '%Negresco%' THEN 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Morango%' THEN 'https://images.unsplash.com/photo-1587393855524-087f83d95c9f?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE 'Açaí com Creme%' THEN 'https://images.unsplash.com/photo-1583334513367-b8e2c8e33ad0?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE 'Açaí com Frutas%' THEN 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE 'Açaí Gourmet%' THEN 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE 'Açaí Tradicional%' THEN 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=800&auto=format&fit=crop&q=80'
  -- Vitamina
  WHEN name ILIKE 'Vitamina%' THEN 'https://images.unsplash.com/photo-1638176067000-9e51de9be99a?w=800&auto=format&fit=crop&q=80'
  -- Milk-shakes (flavor-based, fallback to generic milkshake)
  WHEN name ILIKE 'Milk-shake%Morango%' OR name ILIKE 'Milk-shake%Frutas Vermelhas%' THEN 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE 'Milk-shake%Chocolate%' OR name ILIKE 'Milk-shake%Nutella%' OR name ILIKE 'Milk-shake%Ovomaltine%' OR name ILIKE 'Milk-shake%Negresco%' OR name ILIKE 'Milk-shake%Bis%' OR name ILIKE 'Milk-shake%Kitkat%' OR name ILIKE 'Milk-shake%Brigadeiro%' THEN 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE 'Milk-shake%' THEN 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80'
  -- Potes de Sorvete
  WHEN name ILIKE 'Pote%' OR name ILIKE '%Sorvete%' THEN 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&auto=format&fit=crop&q=80'
  -- Complementos crocantes
  WHEN name ILIKE '%Granola%' THEN 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Bolacha%' OR name ILIKE '%Bis%' THEN 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Calda%Chocolate%' OR name ILIKE '%Nutella%' THEN 'https://images.unsplash.com/photo-1620921586410-16d7b2b1bb96?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Chocobool%' OR name ILIKE '%Ovomaltine%' OR name ILIKE '%Gotas%Chocolate%' THEN 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Paçoca%' THEN 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Leite Condensado%' THEN 'https://images.unsplash.com/photo-1631206753348-db44968fd440?w=800&auto=format&fit=crop&q=80'
  -- Cremes
  WHEN name ILIKE '%Ninho%' THEN 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Cupuaçu%' OR name ILIKE '%Creme%' THEN 'https://images.unsplash.com/photo-1583334513367-b8e2c8e33ad0?w=800&auto=format&fit=crop&q=80'
  -- Frutas (adicional)
  WHEN name ILIKE '%Banana%' THEN 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Manga%' THEN 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Kiwi%' THEN 'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=800&auto=format&fit=crop&q=80'
  WHEN name = 'Frutas' THEN 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80'
  -- Bebidas
  WHEN name ILIKE '%Água%' THEN 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&auto=format&fit=crop&q=80'
  WHEN name ILIKE '%Suco%' THEN 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&auto=format&fit=crop&q=80'
  ELSE image_url
END
WHERE store_id = '6c6bb9ea-6976-4fcc-9f0c-7f1f8328d62b' AND (image_url IS NULL OR image_url = '');
