-- Proper RLS fix for multi-tenant system
-- Apply this after the system is working with temporary RLS disabled
-- Run this in Supabase SQL Editor

-- 1. Re-enable RLS on all tables
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_advances ENABLE ROW LEVEL SECURITY;

-- 2. Create simple, non-recursive policies
-- These policies use the profiles table to get business_id without recursion

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Business_users policies
CREATE POLICY "Users can view business_users for their business" ON public.business_users
    FOR SELECT USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage business_users for their business" ON public.business_users
    FOR ALL USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Transactions policies
CREATE POLICY "Users can view transactions for their business" ON public.transactions
    FOR SELECT USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage transactions for their business" ON public.transactions
    FOR ALL USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Transaction_items policies
CREATE POLICY "Users can view transaction_items for their business" ON public.transaction_items
    FOR SELECT USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage transaction_items for their business" ON public.transaction_items
    FOR ALL USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Cash_entries policies
CREATE POLICY "Users can view cash_entries for their business" ON public.cash_entries
    FOR SELECT USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage cash_entries for their business" ON public.cash_entries
    FOR ALL USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Employees policies
CREATE POLICY "Users can view employees for their business" ON public.employees
    FOR SELECT USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage employees for their business" ON public.employees
    FOR ALL USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Cash_advances policies
CREATE POLICY "Users can view cash_advances for their business" ON public.cash_advances
    FOR SELECT USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage cash_advances for their business" ON public.cash_advances
    FOR ALL USING (
        business_id = (
            SELECT business_id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Test the fix
SELECT 'Proper RLS policies applied successfully' as status;


