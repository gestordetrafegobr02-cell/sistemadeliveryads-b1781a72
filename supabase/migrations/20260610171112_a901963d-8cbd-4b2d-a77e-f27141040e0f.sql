ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);