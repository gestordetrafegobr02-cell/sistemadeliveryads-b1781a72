UPDATE public.products
SET image_url = regexp_replace(image_url, '\?v=\d+$', '') || '?v=4'
WHERE store_id = 'ef1386a2-e4bc-4e9e-8c00-be61c30950f6'
  AND image_url LIKE '%/sfb/%';