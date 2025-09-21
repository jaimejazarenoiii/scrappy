-- Update customer_type constraint to allow new values
-- This migration updates the check constraint to accept 'person', 'company', 'government'

-- Drop the existing check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_customer_type_check;

-- Add the new check constraint with updated values
ALTER TABLE public.transactions ADD CONSTRAINT transactions_customer_type_check 
    CHECK (customer_type IN ('person', 'company', 'government'));

-- Update any existing data that might have old values
UPDATE public.transactions 
SET customer_type = CASE 
    WHEN customer_type = 'individual' THEN 'person'
    WHEN customer_type = 'business' THEN 'company'
    ELSE customer_type
END
WHERE customer_type IN ('individual', 'business');
