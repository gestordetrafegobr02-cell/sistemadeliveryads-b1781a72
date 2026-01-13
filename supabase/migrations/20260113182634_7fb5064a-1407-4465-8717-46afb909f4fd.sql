-- Fix storage bucket policies for store-assets
-- Remove existing permissive policies
DROP POLICY IF EXISTS "Store owners can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view store assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view store assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload store assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own assets" ON storage.objects;

-- Public read access for all store assets (needed for displaying images)
CREATE POLICY "Anyone can view store assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'store-assets');

-- Store owners can upload to their own store folder
-- Path structure: {store_id}/logos/* or {store_id}/products/*
CREATE POLICY "Store owners upload own assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'store-assets' AND
  auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Store owners can update their own store's assets
CREATE POLICY "Store owners update own assets" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'store-assets' AND
  auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Store owners can delete their own store's assets
CREATE POLICY "Store owners delete own assets" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'store-assets' AND
  auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(name))[1]
  )
);