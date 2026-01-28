-- Create abandoned_carts table to track cart abandonments
CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  recovered_at timestamp with time zone,
  converted_to_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Store owners can view their abandoned carts
CREATE POLICY "Store owners can view abandoned carts"
ON public.abandoned_carts FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores
  WHERE stores.id = abandoned_carts.store_id
  AND stores.owner_id = auth.uid()
));

-- Store owners can update their abandoned carts (mark as recovered)
CREATE POLICY "Store owners can update abandoned carts"
ON public.abandoned_carts FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores
  WHERE stores.id = abandoned_carts.store_id
  AND stores.owner_id = auth.uid()
));

-- Allow anonymous inserts for cart tracking
CREATE POLICY "Anyone can create abandoned carts"
ON public.abandoned_carts FOR INSERT
WITH CHECK (store_id IS NOT NULL);

-- Enable realtime for abandoned_carts
ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_carts;

-- Add index for efficient queries
CREATE INDEX idx_abandoned_carts_store_created ON public.abandoned_carts(store_id, created_at DESC);
CREATE INDEX idx_abandoned_carts_phone ON public.abandoned_carts(customer_phone) WHERE customer_phone IS NOT NULL;