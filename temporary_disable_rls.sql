-- Temporarily disable RLS to fix infinite recursion issues
-- This allows the system to work while we fix the policies
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily on problematic tables
ALTER TABLE public.business_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_advances DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on profiles and businesses for security
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Test the fix
SELECT 'RLS temporarily disabled on problematic tables' as status;


