REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_pdv_session_totals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_order_insert() FROM PUBLIC, anon, authenticated;