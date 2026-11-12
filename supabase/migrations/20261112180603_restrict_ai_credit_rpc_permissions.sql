-- Restrict AI credit and financial RPCs to their intended callers.
-- SECURITY DEFINER functions remain protected by their internal role/store checks.
REVOKE ALL ON FUNCTION public.admin_get_ai_financials() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_ai_setting(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_ai_model_pricing(text, text, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_ai_credits_master(uuid, integer, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_ai_credit(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_ai_credit_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refund_ai_credit(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_get_ai_financials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_ai_setting(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_ai_model_pricing(text, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_ai_credits_master(uuid, integer, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_credit_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_credit(uuid) TO service_role;
