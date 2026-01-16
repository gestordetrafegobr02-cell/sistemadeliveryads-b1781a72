-- Enable realtime for orders table so new orders appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;