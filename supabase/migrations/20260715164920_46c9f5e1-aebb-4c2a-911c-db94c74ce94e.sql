
ALTER TABLE public.product_modifiers
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS group_max integer,
  ADD COLUMN IF NOT EXISTS group_sort integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_product_modifiers_group
  ON public.product_modifiers (product_id, group_sort, sort_order);
