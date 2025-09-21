# Jazareno Scrap Trading - Setup Guide

## Overview
This system is configured for **Jazareno Scrap Trading** with two user accounts:
- **owner@scrappy.com** - Full access to all features
- **employee@scrappy.com** - Limited access (Buy/Sell only)

## Setup Steps

### 1. Apply Database Migration
Run the multi-tenant migration script in Supabase SQL Editor:
```sql
-- Run: supabase/migrations/20250121_multi_tenant_migration.sql
```

### 2. Fix RLS Issues (Temporary)
Run the temporary RLS fix to stop infinite recursion errors:
```sql
-- Run: temporary_disable_rls.sql
```

### 3. Setup Jazareno Business
Run the business setup script:
```sql
-- Run: setup_jazareno_business.sql
```

### 4. Create User Accounts in Supabase Auth

#### Owner Account
- **Email**: owner@scrappy.com
- **Password**: [Set a secure password]
- **Role**: owner

#### Employee Account  
- **Email**: employee@scrappy.com
- **Password**: [Set a secure password]
- **Role**: employee

### 5. Verify Setup
After running the scripts, verify:

1. **Business exists**: Check `businesses` table has "Jazareno Scrap Trading"
2. **Users assigned**: Check `profiles` table has both users with correct business_id
3. **Business access**: Check `business_users` table has both users with correct roles
4. **Data isolation**: All existing data should be assigned to Jazareno business

## User Access Levels

### Owner (owner@scrappy.com)
- ✅ **Dashboard** - Full analytics and overview
- ✅ **Buy Scrap** - Purchase materials
- ✅ **Sell Scrap** - Process sales
- ✅ **Payment Processing** - Handle payments
- ✅ **Reports** - Financial metrics and analytics
- ✅ **Cash & Expenses** - Cash management
- ✅ **Employees** - Employee management
- ✅ **All Transactions** - View all transactions

### Employee (employee@scrappy.com)
- ✅ **Dashboard** - Simplified view (today's transactions only)
- ✅ **Buy Scrap** - Purchase materials
- ✅ **Sell Scrap** - Process sales
- ❌ **Payment Processing** - Not accessible
- ❌ **Reports** - Not accessible  
- ❌ **Cash & Expenses** - Not accessible
- ❌ **Employees** - Not accessible
- ❌ **All Transactions** - Not accessible

## Business Information
- **Name**: Jazareno Scrap Trading
- **Business ID**: 00000000-0000-0000-0000-000000000001
- **Description**: Professional scrap metal trading and recycling services
- **Location**: Philippines

## Security Notes
- RLS is temporarily disabled to fix infinite recursion issues
- Apply `proper_rls_fix.sql` later for full security
- All data is isolated by business_id
- Employee access is restricted at the UI level

## Troubleshooting

### If users can't sign in:
1. Check if profiles exist in `profiles` table
2. Verify `business_id` is set correctly
3. Check `business_users` table has correct entries

### If data isn't showing:
1. Verify RLS is disabled (temporary fix)
2. Check `business_id` on all data tables
3. Ensure user has correct business access

### If employee sees too many options:
1. Check user role in `profiles` table
2. Verify Dashboard component role logic
3. Check App.tsx navigation restrictions

## Next Steps
1. Test both user accounts
2. Create some sample transactions
3. Verify data isolation works
4. Apply proper RLS policies when ready
5. Add more employees as needed (manual process)


