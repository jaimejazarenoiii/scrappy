-- Remove the problematic triggers that reference non-existent functions
DROP TRIGGER IF EXISTS update_employee_stats_trigger ON public.transactions;
DROP TRIGGER IF EXISTS update_employee_cash_trigger ON public.cash_advances;

-- Drop the function reference if it exists
DROP FUNCTION IF EXISTS update_employee_stats();

-- Note: The employee statistics (sessions_handled, current_advances) 
-- will be updated through the application code instead of database triggers
-- This is actually better for debugging and maintainability

