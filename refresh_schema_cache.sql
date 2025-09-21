-- =====================================================
-- REFRESH SCHEMA CACHE AND ADD MISSING COLUMNS
-- =====================================================
-- This script will:
-- 1. Add missing businessId columns to all tables
-- 2. Refresh the schema cache
-- 3. Verify the columns exist
-- =====================================================

-- Add businessId to cash_entries table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cash_entries' AND column_name = 'business_id') THEN
        ALTER TABLE cash_entries ADD COLUMN business_id UUID;
        RAISE NOTICE 'Added business_id column to cash_entries table';
    ELSE
        RAISE NOTICE 'business_id column already exists in cash_entries table';
    END IF;
END $$;

-- Add businessId to transactions table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'business_id') THEN
        ALTER TABLE transactions ADD COLUMN business_id UUID;
        RAISE NOTICE 'Added business_id column to transactions table';
    ELSE
        RAISE NOTICE 'business_id column already exists in transactions table';
    END IF;
END $$;

-- Add businessId to transaction_items table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transaction_items' AND column_name = 'business_id') THEN
        ALTER TABLE transaction_items ADD COLUMN business_id UUID;
        RAISE NOTICE 'Added business_id column to transaction_items table';
    ELSE
        RAISE NOTICE 'business_id column already exists in transaction_items table';
    END IF;
END $$;

-- Add businessId to cash_advances table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cash_advances' AND column_name = 'business_id') THEN
        ALTER TABLE cash_advances ADD COLUMN business_id UUID;
        RAISE NOTICE 'Added business_id column to cash_advances table';
    ELSE
        RAISE NOTICE 'business_id column already exists in cash_advances table';
    END IF;
END $$;

-- Add businessId to employees table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'employees' AND column_name = 'business_id') THEN
        ALTER TABLE employees ADD COLUMN business_id UUID;
        RAISE NOTICE 'Added business_id column to employees table';
    ELSE
        RAISE NOTICE 'business_id column already exists in employees table';
    END IF;
END $$;

-- Set default business_id for any existing records
UPDATE cash_entries SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE transactions SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE transaction_items SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE cash_advances SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE employees SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;

-- Verify the columns exist
SELECT 'Schema verification:' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('cash_entries', 'transactions', 'transaction_items', 'cash_advances', 'employees')
  AND column_name = 'business_id'
ORDER BY table_name;

-- Show current data counts
SELECT 'Data verification:' as status;
SELECT 'cash_entries' as table_name, COUNT(*) as count, COUNT(business_id) as with_business_id FROM cash_entries
UNION ALL
SELECT 'transactions', COUNT(*), COUNT(business_id) FROM transactions
UNION ALL
SELECT 'transaction_items', COUNT(*), COUNT(business_id) FROM transaction_items
UNION ALL
SELECT 'cash_advances', COUNT(*), COUNT(business_id) FROM cash_advances
UNION ALL
SELECT 'employees', COUNT(*), COUNT(business_id) FROM employees;

