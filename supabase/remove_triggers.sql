-- Remove all triggers and functions that might be causing issues
DROP TRIGGER IF EXISTS update_employee_stats_trigger ON public.transactions;
DROP TRIGGER IF EXISTS update_employee_cash_trigger ON public.cash_advances;
DROP FUNCTION IF EXISTS update_employee_stats();
DROP FUNCTION IF EXISTS update_employee_stats_for_transaction();
DROP FUNCTION IF EXISTS update_employee_advances();

-- The application will handle updating employee statistics manually
-- This eliminates any potential SQL interference during transaction saves
