-- Clean up conflicting policies
DROP POLICY IF EXISTS "Anyone can view store assets" ON storage.objects;
DROP POLICY IF EXISTS "Direct URL access only for store assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete own assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners delete own assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners upload own assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Create proper policies with corrected folder structure check
-- 1. Public read for store-assets bucket
CREATE POLICY "Anyone can read store assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

-- 2. Authenticated users can upload to their store folder
CREATE POLICY "Store owners can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
  )
);

-- 3. Store owners can update their assets
CREATE POLICY "Store owners can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
  )
);

-- 4. Store owners can delete their assets  
CREATE POLICY "Store owners can delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
  )
);