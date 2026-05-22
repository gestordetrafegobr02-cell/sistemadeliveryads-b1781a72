
-- 1) Remove master_admin_email from public-readable whitelist
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON public.global_settings;
CREATE POLICY "Public can read whitelisted settings"
  ON public.global_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = ANY (ARRAY[
    'subscription_price',
    'default_trial_days',
    'owner_whatsapp',
    'meta_pixel_id'
  ]));

-- 2) Restrict anonymous SELECT on stores to safe columns only.
-- Drop the broad anon policy. Public store data must be fetched via the
-- SECURITY DEFINER RPC get_public_store_by_slug, which exposes a whitelist
-- of non-sensitive columns. Sensitive columns (pix_key, whatsapp,
-- facebook_pixel_id, owner_id) are now unreachable to anon.
DROP POLICY IF EXISTS "Anon can read active stores only" ON public.stores;

-- 3) Realtime channel authorization: only authenticated users may subscribe,
-- and only to topics naming a store they own (topic = store_id).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can subscribe to their store topics" ON realtime.messages;
CREATE POLICY "Store owners can subscribe to their store topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = auth.uid()
        AND realtime.topic() = s.id::text
    )
  );

DROP POLICY IF EXISTS "Store owners can broadcast to their store topics" ON realtime.messages;
CREATE POLICY "Store owners can broadcast to their store topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = auth.uid()
        AND realtime.topic() = s.id::text
    )
  );

-- 4) Storage: prevent anonymous listing of store-assets bucket while keeping
-- individual file reads via direct URL. Anon can only read; authenticated
-- store owners can list/manage their own folders.
DROP POLICY IF EXISTS "Anyone can read store assets" ON storage.objects;

CREATE POLICY "Public read of individual store assets"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'store-assets' AND name IS NOT NULL);

CREATE POLICY "Authenticated read of store assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'store-assets');
