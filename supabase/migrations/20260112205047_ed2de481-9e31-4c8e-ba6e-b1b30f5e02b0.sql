-- Create store-assets storage bucket for logos and product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow public read access to store-assets
CREATE POLICY "Public can view store assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'store-assets');

-- Allow authenticated users to upload their own assets
CREATE POLICY "Store owners can upload assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own assets
CREATE POLICY "Store owners can update own assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'store-assets' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their own assets
CREATE POLICY "Store owners can delete own assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'store-assets' 
  AND auth.uid() IS NOT NULL
);