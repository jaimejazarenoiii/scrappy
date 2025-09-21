# Supabase Schema Cache Refresh Instructions

## The Issue
You're getting this error:
```
Could not find the 'businessId' column of 'cash_entries' in the schema cache
```

This happens when you add new columns to tables but Supabase's schema cache hasn't been updated yet.

## Solutions (try in order):

### 1. Run the Schema Refresh Script
First, run the `refresh_schema_cache.sql` script in your Supabase SQL Editor to ensure all columns are properly added.

### 2. Restart Supabase (if using local development)
If you're running Supabase locally:
```bash
supabase stop
supabase start
```

### 3. Refresh Browser/Application
- Clear your browser cache
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Restart your development server

### 4. Check Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Table Editor**
3. Check if the `business_id` column exists in the `cash_entries` table
4. If it doesn't exist, run the `refresh_schema_cache.sql` script again

### 5. Force Schema Cache Refresh (Advanced)
If the above doesn't work, you can try:
1. Go to **Settings** → **API** in your Supabase dashboard
2. Regenerate your API keys (this forces a cache refresh)
3. Update your environment variables with the new keys

### 6. Verify Column Exists
Run this query in your Supabase SQL Editor to verify:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cash_entries' 
  AND column_name = 'business_id';
```

## Expected Result
After running the refresh script, you should see:
- All tables have `business_id` columns
- The error should disappear
- Cash entries can be added successfully

## If Still Having Issues
The problem might be in the frontend code. Check that:
1. The frontend is using the correct column name (`business_id` not `businessId`)
2. The Supabase client is properly configured
3. The user has the correct permissions to access the table

