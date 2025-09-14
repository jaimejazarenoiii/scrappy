-- Supabase Storage Setup for Junkshop Management System
-- This creates storage buckets for transaction images

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('transaction-images', 'transaction-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('item-images', 'item-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for transaction-images bucket
CREATE POLICY "Allow authenticated users to upload transaction images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'transaction-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to view transaction images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'transaction-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update transaction images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'transaction-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete transaction images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'transaction-images' 
  AND auth.role() = 'authenticated'
);

-- Create storage policies for item-images bucket
CREATE POLICY "Allow authenticated users to upload item images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'item-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to view item images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'item-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update item images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'item-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete item images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'item-images' 
  AND auth.role() = 'authenticated'
);
