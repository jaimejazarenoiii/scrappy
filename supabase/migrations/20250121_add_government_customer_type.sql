-- Add 'government' as a valid customer_type option
-- This allows individual, business, and government customer types

-- Drop the existing check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_customer_type_check;

-- Add the new check constraint that includes 'government'
ALTER TABLE public.transactions ADD CONSTRAINT transactions_customer_type_check 
CHECK (customer_type IN ('individual', 'business', 'government'));
