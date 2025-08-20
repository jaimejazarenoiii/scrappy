-- Setup Demo Users for Junkshop Management System
-- Run this AFTER applying the main schema migration

-- This function helps create demo auth users with proper metadata
-- You'll need to run this with elevated privileges or use the Supabase dashboard

-- Create demo users using Supabase's auth system
-- Note: In production, use the Supabase dashboard or auth API to create these

-- Demo Owner User
-- Email: owner@scrappy.com
-- Password: password123
-- Metadata: {"name": "John Owner", "role": "owner"}

-- Demo Employee User  
-- Email: employee@scrappy.com
-- Password: password123
-- Metadata: {"name": "Jane Employee", "role": "employee"}

-- Alternative: Use the admin API to create users programmatically
-- You can use this JavaScript code in your browser console on the Supabase dashboard:

/*
// Create owner user
const { data: ownerUser, error: ownerError } = await supabase.auth.admin.createUser({
  email: 'owner@scrappy.com',
  password: 'password123',
  user_metadata: {
    name: 'John Owner',
    role: 'owner'
  },
  email_confirm: true
});

// Create employee user
const { data: employeeUser, error: employeeError } = await supabase.auth.admin.createUser({
  email: 'employee@scrappy.com', 
  password: 'password123',
  user_metadata: {
    name: 'Jane Employee',
    role: 'employee'
  },
  email_confirm: true
});

console.log('Users created:', { ownerUser, employeeUser });
*/

-- Manual Profile Creation (if needed)
-- Only run this if the trigger didn't work or you need to manually create profiles

-- First check if profiles already exist
-- SELECT * FROM public.profiles;

-- If no profiles exist, you can manually insert them (replace UUIDs with actual auth user IDs)
/*
INSERT INTO public.profiles (auth_user_id, name, role, phone, email, avatar) VALUES
-- Replace these UUIDs with the actual auth.users.id values from your dashboard
('REPLACE-WITH-OWNER-AUTH-USER-ID', 'John Owner', 'owner', '+63917123456', 'owner@scrappy.com', 'JO'),
('REPLACE-WITH-EMPLOYEE-AUTH-USER-ID', 'Jane Employee', 'employee', '+63918234567', 'employee@scrappy.com', 'JE')
ON CONFLICT (auth_user_id) DO UPDATE SET
name = EXCLUDED.name,
role = EXCLUDED.role,
phone = EXCLUDED.phone,
email = EXCLUDED.email,
avatar = EXCLUDED.avatar;
*/

-- Verify setup
SELECT 'Setup verification:' as status;
SELECT 'Profiles count:' as check_type, COUNT(*) as count FROM public.profiles;
SELECT 'Employees count:' as check_type, COUNT(*) as count FROM public.employees;
SELECT 'Auth users count:' as check_type, COUNT(*) as count FROM auth.users;

-- Show all profiles
SELECT 
  p.id,
  p.name,
  p.role,
  p.email,
  CASE WHEN p.auth_user_id IS NOT NULL THEN 'Has Auth User' ELSE 'No Auth User' END as auth_status
FROM public.profiles p;
