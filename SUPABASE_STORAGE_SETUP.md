# Supabase Storage Setup Guide

## Overview
This guide explains how to set up Supabase Storage for the Junkshop Management System to store transaction and item images instead of using base64 data in the database.

## Benefits of Using Supabase Storage
- **Reduced database size**: No more large base64 strings in JSON fields
- **Better performance**: Faster queries and smaller payloads
- **Image reusability**: Same images can be referenced by multiple transactions
- **External access**: Images are accessible via direct URLs
- **Better caching**: Browser can cache images properly
- **Scalability**: Handles large numbers of images efficiently

## Setup Steps

### 1. Apply the Storage Migration
Run the storage migration to create the necessary buckets and policies:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/migrations/20250121_setup_storage.sql
```

This will create:
- `transaction-images` bucket for session photos
- `item-images` bucket for individual item photos
- Proper RLS policies for authenticated users

### 2. Verify Storage Buckets
In your Supabase dashboard:
1. Go to **Storage** section
2. Verify you have two buckets:
   - `transaction-images`
   - `item-images`
3. Both should be **public** buckets

### 3. Test Image Upload
The system will now:
1. **Upload images** to Supabase Storage when creating transactions
2. **Store URLs** in the database instead of base64 data
3. **Display images** using the stored URLs
4. **Enable external access** to images via direct URLs

## Technical Implementation

### Image Upload Service
- **File**: `src/infrastructure/services/ImageUploadService.ts`
- **Features**:
  - Upload base64 images to Supabase Storage
  - Generate unique filenames
  - Handle multiple image uploads
  - Validate file types and sizes
  - Delete images when needed

### Updated Database Service
- **File**: `src/infrastructure/database/supabaseService.tsx`
- **Changes**:
  - `saveTransaction()` now uploads images to storage
  - Converts base64 to URLs before saving
  - Handles both session and item images

### Updated Components
- **BuyScrap/SellScrap**: Still capture images as base64, but they get uploaded to storage
- **TransactionDetails**: Displays images from URLs (faster loading, external access)

## File Structure
```
supabase/
├── migrations/
│   └── 20250121_setup_storage.sql    # Storage setup migration
src/
├── infrastructure/
│   ├── services/
│   │   └── ImageUploadService.ts     # Image upload service
│   └── database/
│       └── supabaseService.tsx       # Updated to use storage
└── presentation/
    └── components/
        ├── BuyScrap.tsx              # Still captures base64
        ├── SellScrap.tsx             # Still captures base64
        └── TransactionDetails.tsx    # Displays URLs
```

## Testing
1. **Create a new transaction** with images
2. **Check Supabase Storage** - images should appear in buckets
3. **View transaction details** - images should load from URLs
4. **Open image URLs directly** - should work in new tabs

## Migration Notes
- **Existing transactions**: Will still work (base64 images will display)
- **New transactions**: Will use Supabase Storage URLs
- **No data loss**: All existing data remains intact
- **Gradual migration**: Old and new formats work together

## Troubleshooting
- **Images not uploading**: Check Supabase Storage policies
- **Images not displaying**: Verify bucket is public
- **Upload errors**: Check file size limits (5MB max)
- **Permission errors**: Ensure user is authenticated

## Next Steps
1. Apply the storage migration
2. Test with a new transaction
3. Verify images appear in Supabase Storage
4. Confirm images display correctly in transaction details
