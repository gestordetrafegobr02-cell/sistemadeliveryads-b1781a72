create policy "No direct customer access to order status history"
on public.order_status_history
for all
to anon, authenticated
using (false)
with check (false);
