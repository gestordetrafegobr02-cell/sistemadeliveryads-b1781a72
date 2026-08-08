-- Corrigindo imagens com base nas descrições e nomes dos produtos para o Império do Açaí
-- Creme de Ninho (estava com foto genérica/errada) -> Usando imagem de creme/gourmet condizente
UPDATE public.products SET image_url = '/__l5e/assets-v1/63977d21-1ce3-40b1-bf11-e618b29fa271/acai-gourmet.jpg' WHERE id = 'fcdf304e-74d0-4e58-91e5-f73a418fa686';

-- Cupuaçu -> Usando imagem de creme condizente
UPDATE public.products SET image_url = '/__l5e/assets-v1/e05c556e-489f-42f5-842a-97c6a2105267/acai-creme.jpg' WHERE id = '06d28633-3d2a-4ee6-9aaa-1d2aab14c5b5';

-- Nutella (estava com placeholder generic premium) -> Usando imagem de açaí com creme/chocolate
UPDATE public.products SET image_url = '/__l5e/assets-v1/e05c556e-489f-42f5-842a-97c6a2105267/acai-creme.jpg' WHERE id = '2e230198-4265-46ae-ac02-a846eb7b8279';

-- Frutas (estava com placeholder unsplash) -> Usando imagem de açaí com frutas do banco oficial
UPDATE public.products SET image_url = '/__l5e/assets-v1/bca769e3-8642-40a5-836c-4c0b69de0ef9/acai-frutas.jpg' WHERE id = 'cca3f59d-5a84-40e9-8bbc-530f504ac2d9';

-- Granola (estava com placeholder unsplash) -> Usando imagem de açaí tradicional (foco em acompanhamentos)
UPDATE public.products SET image_url = '/__l5e/assets-v1/c129832d-024a-480c-a3ea-2cec03c32a78/acai-tradicional.jpg' WHERE id = '61ebf3b5-6ff0-40d4-87cb-8c1e3f465ab8';

-- Calda de Chocolate (estava com placeholder unsplash) -> Usando imagem gourmet
UPDATE public.products SET image_url = '/__l5e/assets-v1/63977d21-1ce3-40b1-bf11-e618b29fa271/acai-gourmet.jpg' WHERE id = '5720b78b-bbc2-4f7c-ba70-681c53b61127';

-- Chocobool (estava com placeholder unsplash) -> Usando imagem Negresco (visual similar de bolinhas/chocolate)
UPDATE public.products SET image_url = '/__l5e/assets-v1/aff6b152-6948-4a8b-9397-a0d6f89dcccc/acai-negresco.jpg' WHERE id = '8c7cb437-c0f9-4969-b36a-df9eaa7ca290';

-- Gotas de Chocolate (estava com placeholder unsplash) -> Usando imagem gourmet
UPDATE public.products SET image_url = '/__l5e/assets-v1/63977d21-1ce3-40b1-bf11-e618b29fa271/acai-gourmet.jpg' WHERE id = '4517fcdf-6c6a-490c-830a-f3d69b13e158';

-- M&M's (estava com placeholder unsplash) -> Usando imagem com frutas/colorida
UPDATE public.products SET image_url = '/__l5e/assets-v1/bca769e3-8642-40a5-836c-4c0b69de0ef9/acai-frutas.jpg' WHERE id = '5e121da5-e76a-4729-b45f-67abc22862fb';