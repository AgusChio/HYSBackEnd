/*
  # Add storage bucket for report images

  1. Storage
    - Create storage bucket for report images
*/

-- Create storage bucket for report images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-images' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to update their images
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-images' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow public to read images
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'report-images');

-- Create policy to allow authenticated users to delete their images
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-images' AND
  auth.role() = 'authenticated'
);