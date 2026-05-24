-- Tighten anonymous INSERT policy on abandoned_carts to mirror orders guards
DROP POLICY IF EXISTS "Anyone can create abandoned carts" ON public.abandoned_carts;

CREATE POLICY "Anyone can create abandoned carts"
ON public.abandoned_carts
FOR INSERT
TO public
WITH CHECK (
  store_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = abandoned_carts.store_id)
  AND (
    customer_name IS NULL
    OR (length(TRIM(BOTH FROM customer_name)) >= 1 AND length(TRIM(BOTH FROM customer_name)) <= 200)
  )
  AND (customer_phone IS NULL OR length(customer_phone) <= 50)
  AND items IS NOT NULL
  AND jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) <= 100
  AND total >= 0
  AND total <= 100000
);