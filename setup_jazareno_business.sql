-- Setup script for Jazareno Scrap Trading business
-- Run this in Supabase SQL Editor after applying the multi-tenant migration

-- 1. Create the Jazareno Scrap Trading business
INSERT INTO public.businesses (
    id,
    name,
    description,
    address,
    phone,
    email,
    created_by,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Jazareno Scrap Trading',
    'Professional scrap metal trading and recycling services',
    'Philippines',
    '+63-XXX-XXX-XXXX',
    'info@jazarenoscrap.com',
    NULL, -- Will be set when owner signs up
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = NOW();

-- 2. Update existing profiles to use the Jazareno business
-- This will assign any existing users to the Jazareno business
UPDATE public.profiles 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL OR business_id = '00000000-0000-0000-0000-000000000001';

-- 3. Add existing users to business_users table if they're not already there
INSERT INTO public.business_users (business_id, user_id, role, joined_at, is_active)
SELECT 
    '00000000-0000-0000-0000-000000000001' as business_id,
    auth_user_id as user_id,
    CASE 
        WHEN email = 'owner@scrappy.com' THEN 'owner'
        WHEN email = 'employee@scrappy.com' THEN 'employee'
        ELSE 'employee'
    END as role,
    created_at as joined_at,
    true as is_active
FROM public.profiles 
WHERE auth_user_id NOT IN (
    SELECT user_id FROM public.business_users 
    WHERE business_id = '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (business_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- 4. Update existing data to use the Jazareno business_id
-- Transactions
UPDATE public.transactions 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL OR business_id = '00000000-0000-0000-0000-000000000001';

-- Transaction items
UPDATE public.transaction_items 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL OR business_id = '00000000-0000-0000-0000-000000000001';

-- Cash entries
UPDATE public.cash_entries 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL OR business_id = '00000000-0000-0000-0000-000000000001';

-- Employees
UPDATE public.employees 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL OR business_id = '00000000-0000-0000-0000-000000000001';

-- Cash advances
UPDATE public.cash_advances 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL OR business_id = '00000000-0000-0000-0000-000000000001';

-- 5. Verify the setup
SELECT 
    'Business Setup Complete' as status,
    b.name as business_name,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT CASE WHEN p.email = 'owner@scrappy.com' THEN p.id END) as owners,
    COUNT(DISTINCT CASE WHEN p.email = 'employee@scrappy.com' THEN p.id END) as employees
FROM public.businesses b
LEFT JOIN public.profiles p ON p.business_id = b.id
WHERE b.id = '00000000-0000-0000-0000-000000000001'
GROUP BY b.id, b.name;

-- 6. Show user roles
SELECT 
    p.email,
    p.name,
    p.role as profile_role,
    bu.role as business_role,
    bu.is_active
FROM public.profiles p
LEFT JOIN public.business_users bu ON p.auth_user_id = bu.user_id 
    AND bu.business_id = '00000000-0000-0000-0000-000000000001'
WHERE p.email IN ('owner@scrappy.com', 'employee@scrappy.com')
ORDER BY p.email;


