-- Harden guest abandoned-cart writes without exposing the limiter table.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres;

CREATE TABLE IF NOT EXISTS private.abandoned_cart_write_limits (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  updated_count integer NOT NULL DEFAULT 0 CHECK (updated_count >= 0)
);
REVOKE ALL ON TABLE private.abandoned_cart_write_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_abandoned_cart(
  p_cart_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_total numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_items jsonb;
  v_subtotal numeric;
  v_cart_id uuid;
  v_name text := left(trim(coalesce(p_customer_name, '')), 120);
  v_phone text := left(regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g'), 15);
  v_window_started timestamptz;
  v_created_count integer;
  v_updated_count integer;
  v_is_create boolean := false;
BEGIN
  IF p_store_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.stores WHERE id = p_store_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid store';
  END IF;

  -- Only collect abandoned carts when the customer can actually be contacted.
  IF length(v_name) < 2 OR length(v_phone) NOT BETWEEN 10 AND 15 THEN
    RAISE EXCEPTION 'Valid customer name and phone are required';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Invalid cart item count';
  END IF;

  -- Serialize writes per store and enforce bounded write volume.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_store_id::text, 0));
  SELECT window_started_at, created_count, updated_count
    INTO v_window_started, v_created_count, v_updated_count
    FROM private.abandoned_cart_write_limits
   WHERE store_id = p_store_id
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO private.abandoned_cart_write_limits(store_id, window_started_at, created_count, updated_count)
    VALUES (p_store_id, now(), 0, 0)
    ON CONFLICT (store_id) DO NOTHING;
    SELECT window_started_at, created_count, updated_count
      INTO v_window_started, v_created_count, v_updated_count
      FROM private.abandoned_cart_write_limits
     WHERE store_id = p_store_id
     FOR UPDATE;
  END IF;

  IF v_window_started < now() - interval '1 minute' THEN
    UPDATE private.abandoned_cart_write_limits
       SET window_started_at = now(), created_count = 0, updated_count = 0
     WHERE store_id = p_store_id;
    v_created_count := 0;
    v_updated_count := 0;
  END IF;

  SELECT canonical_items, subtotal
    INTO v_items, v_subtotal
    FROM public._canonicalize_order_items(p_store_id, p_items);

  -- Never trust the client total; use prices canonicalized from the database.
  SELECT coalesce(
    jsonb_agg(jsonb_build_object(
      'id', e.value->'id',
      'name', e.value->'name',
      'quantity', e.value->'quantity',
      'price', e.value->'price'
    )),
    '[]'::jsonb
  )
    INTO v_items
    FROM jsonb_array_elements(v_items) e;

  IF p_cart_id IS NOT NULL THEN
    UPDATE public.abandoned_carts
       SET customer_name = v_name,
           customer_phone = v_phone,
           items = v_items,
           total = v_subtotal
     WHERE id = p_cart_id
       AND store_id = p_store_id
       AND recovered_at IS NULL
       AND converted_to_order_id IS NULL
     RETURNING id INTO v_cart_id;
    IF v_cart_id IS NULL THEN
      RAISE EXCEPTION 'Cart not found or already recovered';
    END IF;
  ELSE
    -- Reuse the active cart for this store/customer instead of creating a row
    -- on every fresh browser session.
    SELECT id INTO v_cart_id
      FROM public.abandoned_carts
     WHERE store_id = p_store_id
       AND customer_phone = v_phone
       AND recovered_at IS NULL
       AND converted_to_order_id IS NULL
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE;

    IF v_cart_id IS NOT NULL THEN
      UPDATE public.abandoned_carts
         SET customer_name = v_name, items = v_items, total = v_subtotal
       WHERE id = v_cart_id;
    ELSE
      v_is_create := true;
      IF v_created_count >= 60 THEN
        RAISE EXCEPTION 'Cart capture rate limit exceeded';
      END IF;
      INSERT INTO public.abandoned_carts(store_id, customer_name, customer_phone, items, total)
      VALUES (p_store_id, v_name, v_phone, v_items, v_subtotal)
      RETURNING id INTO v_cart_id;
    END IF;
  END IF;

  IF v_is_create THEN
    UPDATE private.abandoned_cart_write_limits
       SET created_count = created_count + 1
     WHERE store_id = p_store_id;
  ELSE
    IF v_updated_count >= 300 THEN
      RAISE EXCEPTION 'Cart update rate limit exceeded';
    END IF;
    UPDATE private.abandoned_cart_write_limits
       SET updated_count = updated_count + 1
     WHERE store_id = p_store_id;
  END IF;

  RETURN v_cart_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_abandoned_cart(uuid, uuid, text, text, jsonb, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_abandoned_cart(uuid, uuid, text, text, jsonb, numeric) TO anon, authenticated, service_role;
