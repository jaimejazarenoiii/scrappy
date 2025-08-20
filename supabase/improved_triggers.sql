-- Drop existing triggers and function
DROP TRIGGER IF EXISTS update_employee_stats_trigger ON public.transactions;
DROP TRIGGER IF EXISTS update_employee_cash_trigger ON public.cash_advances;
DROP FUNCTION IF EXISTS update_employee_stats();

-- Create a more efficient function that only updates affected employees
CREATE OR REPLACE FUNCTION update_employee_stats_for_transaction()
RETURNS TRIGGER AS $$
DECLARE
    employee_name TEXT;
BEGIN
    -- Get the employee name from the transaction
    IF TG_OP = 'DELETE' THEN
        employee_name := OLD.employee;
    ELSE
        employee_name := NEW.employee;
    END IF;
    
    -- Update sessions_handled for the specific employee
    UPDATE public.employees e
    SET sessions_handled = (
        SELECT COUNT(DISTINCT t.id)
        FROM public.transactions t
        WHERE t.employee = employee_name
    )
    WHERE e.name = employee_name;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for cash advances
CREATE OR REPLACE FUNCTION update_employee_advances()
RETURNS TRIGGER AS $$
DECLARE
    emp_id UUID;
BEGIN
    -- Get the employee ID
    IF TG_OP = 'DELETE' THEN
        emp_id := OLD.employee_id;
    ELSE
        emp_id := NEW.employee_id;
    END IF;
    
    -- Update current_advances for the specific employee
    UPDATE public.employees e
    SET current_advances = (
        SELECT COALESCE(SUM(ca.amount), 0)
        FROM public.cash_advances ca
        WHERE ca.employee_id = emp_id AND ca.status = 'active'
    )
    WHERE e.id = emp_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers that run FOR EACH ROW (more efficient)
CREATE TRIGGER update_employee_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_employee_stats_for_transaction();

CREATE TRIGGER update_employee_advances_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.cash_advances
    FOR EACH ROW EXECUTE FUNCTION update_employee_advances();

