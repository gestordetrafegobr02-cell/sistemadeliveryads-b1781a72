
-- Allow anonymous users to update their own abandoned carts (by id)
-- This is needed because the tracking hook does INSERT then UPDATE
CREATE POLICY "Anyone can update their abandoned carts"
ON public.abandoned_carts
FOR UPDATE
USING (recovered_at IS NULL AND converted_to_order_id IS NULL)
WITH CHECK (true);
