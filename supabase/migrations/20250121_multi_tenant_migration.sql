-- Multi-Tenant Migration for Junkshop Management System
-- This migration adds business/tenant grouping to support multiple scrap trading businesses

-- 1. Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Add business_id to all existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_items ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.cash_entries ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.cash_advances ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- 3. Create business_users junction table for user-business relationships
CREATE TABLE IF NOT EXISTS public.business_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee', 'viewer')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- 4. Create business_invitations table for inviting users
CREATE TABLE IF NOT EXISTS public.business_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee', 'viewer')),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES auth.users(id),
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_name ON public.businesses(name);
CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON public.businesses(created_by);
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON public.business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON public.business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_invitations_business_id ON public.business_invitations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_invitations_email ON public.business_invitations(email);
CREATE INDEX IF NOT EXISTS idx_business_invitations_token ON public.business_invitations(token);

-- Add business_id indexes to existing tables
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON public.employees(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON public.transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_business_id ON public.transaction_items(business_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_business_id ON public.cash_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_cash_advances_business_id ON public.cash_advances(business_id);

-- 6. Enable RLS on new tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_invitations ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for businesses
CREATE POLICY "Users can view businesses they belong to" ON public.businesses
    FOR SELECT USING (
        id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Business owners can update their business" ON public.businesses
    FOR UPDATE USING (
        id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
        )
    );

CREATE POLICY "Business owners can create businesses" ON public.businesses
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- 8. Create RLS policies for business_users
CREATE POLICY "Users can view business_users for their businesses" ON public.business_users
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Business owners can manage business_users" ON public.business_users
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
        )
    );

-- 9. Create RLS policies for business_invitations
CREATE POLICY "Users can view invitations for their businesses" ON public.business_invitations
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Business owners can manage invitations" ON public.business_invitations
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
        )
    );

-- 10. Update existing RLS policies to include business_id filtering

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their businesses" ON public.profiles
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Update employees policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
CREATE POLICY "Users can view employees in their businesses" ON public.employees
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Owners can manage employees" ON public.employees;
CREATE POLICY "Business owners can manage employees" ON public.employees
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = true
        )
    );

-- Update transactions policies
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
CREATE POLICY "Users can view transactions in their businesses" ON public.transactions
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;
CREATE POLICY "Users can create transactions in their businesses" ON public.transactions
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Update cash_entries policies
DROP POLICY IF EXISTS "Authenticated users can view cash entries" ON public.cash_entries;
CREATE POLICY "Users can view cash entries in their businesses" ON public.cash_entries
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Update cash_advances policies
DROP POLICY IF EXISTS "Users can view relevant cash advances" ON public.cash_advances;
CREATE POLICY "Users can view cash advances in their businesses" ON public.cash_advances
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 11. Create functions for business management

-- Function to create a new business and assign owner
CREATE OR REPLACE FUNCTION create_business_with_owner(
    business_name TEXT,
    business_description TEXT DEFAULT NULL,
    business_address TEXT DEFAULT NULL,
    business_phone TEXT DEFAULT NULL,
    business_email TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_business_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Create the business
    INSERT INTO public.businesses (name, description, address, phone, email, created_by)
    VALUES (business_name, business_description, business_address, business_phone, business_email, current_user_id)
    RETURNING id INTO new_business_id;
    
    -- Add the creator as owner
    INSERT INTO public.business_users (business_id, user_id, role, joined_at)
    VALUES (new_business_id, current_user_id, 'owner', NOW());
    
    -- Update the user's profile with business_id
    UPDATE public.profiles 
    SET business_id = new_business_id 
    WHERE auth_user_id = current_user_id;
    
    RETURN new_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite a user to a business
CREATE OR REPLACE FUNCTION invite_user_to_business(
    target_business_id UUID,
    target_email TEXT,
    target_role TEXT
) RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Check if user has permission to invite
    IF NOT EXISTS (
        SELECT 1 FROM public.business_users 
        WHERE business_id = target_business_id 
        AND user_id = current_user_id 
        AND role IN ('owner', 'manager') 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users';
    END IF;
    
    -- Generate unique token
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create invitation
    INSERT INTO public.business_invitations (business_id, email, role, token, expires_at, invited_by)
    VALUES (target_business_id, target_email, target_role, invitation_token, NOW() + INTERVAL '7 days', current_user_id)
    RETURNING id INTO invitation_id;
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept business invitation
CREATE OR REPLACE FUNCTION accept_business_invitation(
    invitation_token TEXT
) RETURNS UUID AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    user_email TEXT;
BEGIN
    current_user_id := auth.uid();
    
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
    
    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM public.business_invitations 
    WHERE token = invitation_token 
    AND email = user_email 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Add user to business
    INSERT INTO public.business_users (business_id, user_id, role, joined_at)
    VALUES (invitation_record.business_id, current_user_id, invitation_record.role, NOW())
    ON CONFLICT (business_id, user_id) DO UPDATE SET
        role = invitation_record.role,
        is_active = true,
        joined_at = NOW();
    
    -- Update invitation status
    UPDATE public.business_invitations 
    SET status = 'accepted', accepted_by = current_user_id, updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Update user's profile with business_id if not set
    UPDATE public.profiles 
    SET business_id = invitation_record.business_id 
    WHERE auth_user_id = current_user_id AND business_id IS NULL;
    
    RETURN invitation_record.business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create trigger to automatically set business_id for new records
CREATE OR REPLACE FUNCTION set_business_id_from_user()
RETURNS TRIGGER AS $$
DECLARE
    user_business_id UUID;
BEGIN
    -- Get the user's primary business_id
    SELECT business_id INTO user_business_id
    FROM public.profiles 
    WHERE auth_user_id = auth.uid();
    
    -- Set business_id if not already set
    IF NEW.business_id IS NULL AND user_business_id IS NOT NULL THEN
        NEW.business_id := user_business_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER set_business_id_transactions
    BEFORE INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION set_business_id_from_user();

CREATE TRIGGER set_business_id_transaction_items
    BEFORE INSERT ON public.transaction_items
    FOR EACH ROW EXECUTE FUNCTION set_business_id_from_user();

CREATE TRIGGER set_business_id_cash_entries
    BEFORE INSERT ON public.cash_entries
    FOR EACH ROW EXECUTE FUNCTION set_business_id_from_user();

CREATE TRIGGER set_business_id_cash_advances
    BEFORE INSERT ON public.cash_advances
    FOR EACH ROW EXECUTE FUNCTION set_business_id_from_user();

CREATE TRIGGER set_business_id_employees
    BEFORE INSERT ON public.employees
    FOR EACH ROW EXECUTE FUNCTION set_business_id_from_user();

-- 13. Create a default business for existing data migration
INSERT INTO public.businesses (id, name, description, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Business',
    'Default business for existing data migration',
    (SELECT id FROM auth.users LIMIT 1)
) ON CONFLICT (id) DO NOTHING;

-- 14. Update existing data to use default business
UPDATE public.profiles 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

UPDATE public.employees 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

UPDATE public.transactions 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

UPDATE public.transaction_items 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

UPDATE public.cash_entries 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

UPDATE public.cash_advances 
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL;

-- 15. Add business_users for existing users
INSERT INTO public.business_users (business_id, user_id, role, joined_at)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    auth_user_id,
    role,
    created_at
FROM public.profiles
WHERE auth_user_id IS NOT NULL
ON CONFLICT (business_id, user_id) DO NOTHING;

-- 16. Make business_id NOT NULL after migration
ALTER TABLE public.profiles ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.employees ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.transaction_items ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.cash_entries ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.cash_advances ALTER COLUMN business_id SET NOT NULL;

-- 17. Add comments for documentation
COMMENT ON TABLE public.businesses IS 'Multi-tenant businesses/junkshops';
COMMENT ON TABLE public.business_users IS 'User-business relationships with roles';
COMMENT ON TABLE public.business_invitations IS 'Pending invitations to join businesses';
COMMENT ON COLUMN public.profiles.business_id IS 'Primary business the user belongs to';
COMMENT ON COLUMN public.employees.business_id IS 'Business this employee belongs to';
COMMENT ON COLUMN public.transactions.business_id IS 'Business this transaction belongs to';
COMMENT ON COLUMN public.transaction_items.business_id IS 'Business this transaction item belongs to';
COMMENT ON COLUMN public.cash_entries.business_id IS 'Business this cash entry belongs to';
COMMENT ON COLUMN public.cash_advances.business_id IS 'Business this cash advance belongs to';


