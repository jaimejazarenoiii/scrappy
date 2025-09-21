-- Fix user business association
-- Run this in Supabase SQL Editor to assign existing users to the Jazareno business

-- 1. Update all profiles that don't have a business_id to use the default business
UPDATE public.profiles 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

-- 2. Ensure the Jazareno business exists
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
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = NOW();

-- 3. Add all users to business_users table if they're not already there
INSERT INTO public.business_users (business_id, profile_id, role, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000001' as business_id,
    p.id as profile_id,
    CASE 
        WHEN p.email = 'owner@scrappy.com' THEN 'owner'
        WHEN p.email = 'employee@scrappy.com' THEN 'employee'
        ELSE 'employee'
    END as role,
    NOW() as created_at,
    NOW() as updated_at
FROM public.profiles p
WHERE p.business_id = '00000000-0000-0000-0000-000000000001'
AND NOT EXISTS (
    SELECT 1 FROM public.business_users bu 
    WHERE bu.business_id = '00000000-0000-0000-0000-000000000001' 
    AND bu.profile_id = p.id
);

-- 4. Verify the setup
SELECT 
    p.email,
    p.name,
    p.role as profile_role,
    p.business_id,
    b.name as business_name,
    bu.role as business_user_role
FROM public.profiles p
LEFT JOIN public.businesses b ON p.business_id = b.id
LEFT JOIN public.business_users bu ON bu.business_id = p.business_id AND bu.profile_id = p.id
ORDER BY p.email;


