-- =====================================================
-- DATABASE CLEANUP AND RLS FIX SCRIPT (MULTI-TENANT)
-- =====================================================
-- This script will:
-- 1. Clean up all transaction-related data
-- 2. Fix RLS policies for multi-tenant setup
-- 3. Update default users
-- 4. Keep multi-tenant structure intact
-- =====================================================

-- Step 1: Disable RLS temporarily for cleanup
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_users DISABLE ROW LEVEL SECURITY;

-- Step 1.5: Add missing businessId columns if they don't exist
-- Add businessId to cash_entries table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cash_entries' AND column_name = 'business_id') THEN
        ALTER TABLE cash_entries ADD COLUMN business_id UUID;
    END IF;
END $$;

-- Add businessId to transactions table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'business_id') THEN
        ALTER TABLE transactions ADD COLUMN business_id UUID;
    END IF;
END $$;

-- Add businessId to transaction_items table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transaction_items' AND column_name = 'business_id') THEN
        ALTER TABLE transaction_items ADD COLUMN business_id UUID;
    END IF;
END $$;

-- Add businessId to cash_advances table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cash_advances' AND column_name = 'business_id') THEN
        ALTER TABLE cash_advances ADD COLUMN business_id UUID;
    END IF;
END $$;

-- Step 2: Delete all transaction-related data
-- Delete in order to respect foreign key constraints
DELETE FROM transaction_items;
DELETE FROM cash_entries;  -- Must delete before transactions due to foreign key
DELETE FROM cash_advances;
DELETE FROM transactions;  -- Delete after cash_entries
DELETE FROM employees;

-- Step 3: Keep business_users table intact (multi-tenant structure)
-- Only clean up if there are orphaned entries
DELETE FROM business_users WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 3.5: Set default business_id for any existing records (if any remain)
UPDATE cash_entries SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE transactions SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE transaction_items SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE cash_advances SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE employees SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;

-- Step 4: Update default users
-- Update owner user
UPDATE auth.users 
SET email = 'jjazarenojr@jst.com'
WHERE email = 'owner@scrappy.com';

UPDATE profiles 
SET name = 'Jaime Jazareno Jr (Owner)'
WHERE id = (SELECT id FROM auth.users WHERE email = 'jjazarenojr@jst.com');

-- Update employee user
UPDATE auth.users 
SET email = 'jjazarenojr_employee@jst.com'
WHERE email = 'employee@scrappy.com';

UPDATE profiles 
SET name = 'Jaime Jazareno Jr (Employee)'
WHERE id = (SELECT id FROM auth.users WHERE email = 'jjazarenojr_employee@jst.com');

-- Step 5: Re-enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies (clean slate)
-- Drop all existing policies on all tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
    
    -- Drop all policies on transactions table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transactions' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON transactions';
    END LOOP;
    
    -- Drop all policies on transaction_items table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transaction_items' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON transaction_items';
    END LOOP;
    
    -- Drop all policies on cash_entries table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'cash_entries' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON cash_entries';
    END LOOP;
    
    -- Drop all policies on cash_advances table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'cash_advances' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON cash_advances';
    END LOOP;
    
    -- Drop all policies on employees table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'employees' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON employees';
    END LOOP;
    
    -- Drop all policies on business_users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'business_users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON business_users';
    END LOOP;
END $$;

-- Step 7: Create new multi-tenant RLS policies
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Business users policies
CREATE POLICY "Users can view their business_users" ON business_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their business_users" ON business_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Transactions policies (multi-tenant with business_id filtering)
CREATE POLICY "Users can view transactions from their business" ON transactions
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert transactions for their business" ON transactions
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transactions from their business" ON transactions
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

-- Transaction items policies (multi-tenant with business_id filtering)
CREATE POLICY "Users can view transaction items from their business" ON transaction_items
    FOR SELECT USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE business_id IN (
                SELECT business_id FROM business_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert transaction items for their business" ON transaction_items
    FOR INSERT WITH CHECK (
        transaction_id IN (
            SELECT id FROM transactions WHERE business_id IN (
                SELECT business_id FROM business_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update transaction items from their business" ON transaction_items
    FOR UPDATE USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE business_id IN (
                SELECT business_id FROM business_users WHERE user_id = auth.uid()
            )
        )
    );

-- Cash entries policies (multi-tenant with business_id filtering)
CREATE POLICY "Users can view cash entries from their business" ON cash_entries
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert cash entries for their business" ON cash_entries
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update cash entries from their business" ON cash_entries
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

-- Cash advances policies (multi-tenant with business_id filtering)
CREATE POLICY "Users can view cash advances from their business" ON cash_advances
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert cash advances for their business" ON cash_advances
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update cash advances from their business" ON cash_advances
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

-- Employees policies (multi-tenant with business_id filtering)
CREATE POLICY "Users can view employees from their business" ON employees
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert employees for their business" ON employees
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update employees from their business" ON employees
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

-- Step 8: Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 9: Create default employees for the new users
INSERT INTO employees (name, role, phone, email, avatar, sessions_handled, current_advances, weekly_salary, business_id)
VALUES 
    ('Jaime Jazareno Jr (Owner)', 'owner', '+63-XXX-XXX-XXXX', 'jjazarenojr@jst.com', 'https://avatar.vercel.sh/jjazarenojr.png', 0, 0, 0, '00000000-0000-0000-0000-000000000001'),
    ('Jaime Jazareno Jr (Employee)', 'employee', '+63-XXX-XXX-XXXX', 'jjazarenojr_employee@jst.com', 'https://avatar.vercel.sh/jjazarenojr_employee.png', 0, 0, 0, '00000000-0000-0000-0000-000000000001');

-- Step 10: Verify the cleanup
SELECT 'Cleanup completed successfully' as status;
SELECT 'Updated users:' as info;
SELECT email, created_at FROM auth.users WHERE email IN ('jjazarenojr@jst.com', 'jjazarenojr_employee@jst.com');
SELECT 'Remaining data counts:' as info;
SELECT 'transactions' as table_name, COUNT(*) as count FROM transactions
UNION ALL
SELECT 'transaction_items', COUNT(*) FROM transaction_items
UNION ALL
SELECT 'cash_entries', COUNT(*) FROM cash_entries
UNION ALL
SELECT 'cash_advances', COUNT(*) FROM cash_advances
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'business_users', COUNT(*) FROM business_users;
