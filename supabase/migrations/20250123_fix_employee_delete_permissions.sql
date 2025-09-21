-- Fix employee delete permissions by ensuring current user has business access
-- This migration ensures that the current user can delete employees

-- First, let's check if there are any users without business_users entries
-- and add them to a default business with owner role

-- Create a default business if it doesn't exist
INSERT INTO public.businesses (id, name, created_by)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Business', auth.uid())
ON CONFLICT (id) DO NOTHING;

-- Add all authenticated users to the default business with owner role
-- This ensures they can manage employees
INSERT INTO public.business_users (user_id, business_id, role, is_active, permissions, invited_by, invited_at)
SELECT 
    auth.uid() as user_id,
    '00000000-0000-0000-0000-000000000001'::uuid as business_id,
    'owner'::text as role,
    true as is_active,
    '{"canManageEmployees": true, "canManageTransactions": true, "canViewReports": true, "canManageCash": true}'::jsonb as permissions,
    NULL as invited_by,
    NOW() as invited_at
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.business_users 
    WHERE user_id = auth.uid() 
    AND business_id = '00000000-0000-0000-0000-000000000001'
);

-- Update existing employees to belong to the default business if they don't have a business_id
UPDATE public.employees 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

-- Also ensure cash_advances have the correct business_id
UPDATE public.cash_advances 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;
