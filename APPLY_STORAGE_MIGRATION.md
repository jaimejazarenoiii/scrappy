# Apply Supabase Storage Migration

## Issue
Session images are showing as `undefined` because the Supabase Storage buckets haven't been created yet.

## Solution
You need to apply the storage migration to create the necessary buckets and policies.

## Steps

### 1. Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**

### 2. Run the Migration
Copy and paste this SQL into the SQL Editor and run it:

```sql
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
```

### 3. Verify Setup
1. Go to **Storage** section in your Supabase dashboard
2. You should see two buckets:
   - `transaction-images`
   - `item-images`
3. Both should be **public** buckets

### 4. Test Image Upload
After applying the migration:
1. Create a new transaction with session images
2. Check the browser console for any upload errors
3. Check the Supabase Storage dashboard for uploaded files
4. View transaction details to see if images display

## Expected Result
After applying the migration, the debug information should show:
```json
{
  "hasSessionImages": true,
  "sessionImagesType": "object",
  "sessionImagesLength": 2,
  "sessionImages": [
    "https://whzrrhbsctombgnakfwy.supabase.co/storage/v1/object/public/transaction-images/...",
    "https://whzrrhbsctombgnakfwy.supabase.co/storage/v1/object/public/transaction-images/..."
  ],
  "note": "Images are now stored as URLs in Supabase Storage (not base64)"
}
```

## Troubleshooting
- **"Bucket does not exist" error**: Make sure you ran the migration SQL
- **"Permission denied" error**: Check that RLS policies are created
- **Images still undefined**: Check browser console for upload errors
