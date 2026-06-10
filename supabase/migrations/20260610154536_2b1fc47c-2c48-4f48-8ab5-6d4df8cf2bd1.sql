-- Move mercadopago_access_token out of stores into a server-only table.
CREATE TABLE IF NOT EXISTS public.store_secrets (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  mercadopago_access_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only. No grants for anon/authenticated => never reaches the client.
GRANT ALL ON public.store_secrets TO service_role;
ALTER TABLE public.store_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies for anon/authenticated. Access via SECURITY DEFINER RPCs only.

-- Backfill from stores, then drop the exposed column.
INSERT INTO public.store_secrets (store_id, mercadopago_access_token)
SELECT id, mercadopago_access_token
FROM public.stores
WHERE mercadopago_access_token IS NOT NULL
ON CONFLICT (store_id) DO UPDATE SET mercadopago_access_token = EXCLUDED.mercadopago_access_token;

ALTER TABLE public.stores DROP COLUMN IF EXISTS mercadopago_access_token;

-- Owner-only writer.
CREATE OR REPLACE FUNCTION public.set_store_mercadopago_token(_store_id uuid, _token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = _store_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  INSERT INTO public.store_secrets (store_id, mercadopago_access_token, updated_at)
  VALUES (_store_id, NULLIF(_token, ''), now())
  ON CONFLICT (store_id) DO UPDATE
    SET mercadopago_access_token = EXCLUDED.mercadopago_access_token,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_store_mercadopago_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_store_mercadopago_token(uuid, text) TO authenticated;

-- Owner-only existence check (never returns the token).
CREATE OR REPLACE FUNCTION public.has_store_mercadopago_token(_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ok boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = _store_id AND owner_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;
  SELECT (mercadopago_access_token IS NOT NULL AND length(mercadopago_access_token) > 0)
    INTO _ok FROM public.store_secrets WHERE store_id = _store_id;
  RETURN COALESCE(_ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.has_store_mercadopago_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_store_mercadopago_token(uuid) TO authenticated;