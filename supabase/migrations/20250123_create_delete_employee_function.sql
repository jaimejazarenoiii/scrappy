-- Create a function to delete employees with cascade, bypassing RLS policies
-- This function runs with SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION delete_employee_with_cascade(employee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete cash advances first
  DELETE FROM public.cash_advances WHERE employee_id = delete_employee_with_cascade.employee_id;
  
  -- Delete the employee
  DELETE FROM public.employees WHERE id = delete_employee_with_cascade.employee_id;
  
  -- Return true if we get here (no exceptions)
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE EXCEPTION 'Error deleting employee %: %', employee_id, SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_employee_with_cascade(UUID) TO authenticated;
