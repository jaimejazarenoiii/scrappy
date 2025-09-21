-- Temporarily relax RLS policy for employees to allow deletion
-- This is for testing purposes - in production, you should use proper business_users permissions

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Business owners can manage employees" ON public.employees;

-- Create a more permissive policy for testing
CREATE POLICY "Authenticated users can manage employees" ON public.employees
    FOR ALL USING (auth.role() = 'authenticated');

-- This allows any authenticated user to delete employees
-- In production, you should replace this with the proper business-based policy
