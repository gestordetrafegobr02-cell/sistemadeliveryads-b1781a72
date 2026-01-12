-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  items jsonb NOT NULL,
  total numeric NOT NULL,
  status text DEFAULT 'pending',
  address text,
  payment_method text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Store owners can view their orders
CREATE POLICY "Owners can view orders"
ON public.orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()
));

-- Store owners can delete orders
CREATE POLICY "Owners can delete orders"
ON public.orders FOR DELETE
USING (EXISTS (
  SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()
));

-- Public can insert orders (for checkout)
CREATE POLICY "Public can insert orders"
ON public.orders FOR INSERT
WITH CHECK (true);