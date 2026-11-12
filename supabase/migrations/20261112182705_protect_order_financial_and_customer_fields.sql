
CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Authenticated store staff may advance the order status only.
  -- Payment/webhook Edge Functions use the service role and can update
  -- server-managed fields without a user JWT.
  IF auth.uid() IS NOT NULL AND NOT public.is_master_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.store_id IS DISTINCT FROM OLD.store_id
      OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
      OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
      OR NEW.items IS DISTINCT FROM OLD.items
      OR NEW.total IS DISTINCT FROM OLD.total
      OR NEW.address IS DISTINCT FROM OLD.address
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.customer_session_token IS DISTINCT FROM OLD.customer_session_token
      OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
      OR NEW.delivery_person_name IS DISTINCT FROM OLD.delivery_person_name
      OR NEW.delivery_person_phone IS DISTINCT FROM OLD.delivery_person_phone
      OR NEW.estimated_delivery_at IS DISTINCT FROM OLD.estimated_delivery_at
    THEN
      RAISE EXCEPTION 'order_financial_fields_are_server_managed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_order_financial_fields ON public.orders;
CREATE TRIGGER protect_order_financial_fields
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.protect_order_financial_fields();
