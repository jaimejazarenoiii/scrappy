-- Supabase Database Schema for Junkshop Management System
-- This creates all necessary tables with proper relationships and real-time enabled

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
    phone TEXT,
    email TEXT,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar TEXT,
    weekly_salary DECIMAL(10,2) DEFAULT 0,
    current_advances DECIMAL(10,2) DEFAULT 0,
    sessions_handled INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Cash advances table
CREATE TABLE IF NOT EXISTS public.cash_advances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'deducted')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY, -- Keep as TEXT to match existing IDs like "TXN-001"
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    customer_name TEXT,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('individual', 'business')),
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    expenses DECIMAL(10,2) DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    employee TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in-progress', 'for-payment', 'completed', 'cancelled')),
    is_delivery BOOLEAN DEFAULT FALSE,
    is_pickup BOOLEAN DEFAULT FALSE,
    location TEXT,
    session_images JSONB,
    created_by UUID REFERENCES public.profiles(id),
    created_by_name TEXT,
    created_by_role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction items table (normalized from the items array)
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight DECIMAL(10,3),
    pieces INTEGER,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    images JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash entries table
CREATE TABLE IF NOT EXISTS public.cash_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('opening', 'transaction', 'expense', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    employee TEXT NOT NULL,
    transaction_id TEXT REFERENCES public.transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Cash advances table
CREATE TABLE IF NOT EXISTS public.cash_advances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'deducted', 'pending')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_employee ON public.transactions(employee);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON public.transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_cash_entries_type ON public.cash_entries(type);
CREATE INDEX IF NOT EXISTS idx_cash_entries_timestamp ON public.cash_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_cash_advances_employee ON public.cash_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON public.transaction_items(transaction_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Employees: All authenticated users can read, only owners can manage
CREATE POLICY "Authenticated users can view employees" ON public.employees
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can manage employees" ON public.employees
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE role = 'owner'
        )
    );

-- Cash advances: Employees can view their own, owners can view all
CREATE POLICY "Users can view relevant cash advances" ON public.cash_advances
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE role = 'owner'
        ) OR
        employee_id IN (
            SELECT id FROM public.employees WHERE name = (
                SELECT name FROM public.profiles WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Owners can manage cash advances" ON public.cash_advances
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE role = 'owner'
        )
    );

-- Transactions: All authenticated users can view, create and update
CREATE POLICY "Authenticated users can view transactions" ON public.transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update transactions" ON public.transactions
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            -- Owners can edit any transaction
            auth.uid() IN (
                SELECT auth_user_id FROM public.profiles WHERE role = 'owner'
            ) OR
            -- Employees can edit their own in-progress transactions
            (employee = (SELECT name FROM public.profiles WHERE auth_user_id = auth.uid()) AND status = 'in-progress')
        )
    );

-- Transaction items: Follow transaction policies
CREATE POLICY "Authenticated users can view transaction items" ON public.transaction_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage transaction items" ON public.transaction_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Cash entries: All authenticated users can view and create
CREATE POLICY "Authenticated users can view cash entries" ON public.cash_entries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create cash entries" ON public.cash_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Cash advances: All authenticated users can view and manage
CREATE POLICY "Authenticated users can view cash advances" ON public.cash_advances
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create cash advances" ON public.cash_advances
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cash advances" ON public.cash_advances
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_advances_updated_at BEFORE UPDATE ON public.cash_advances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_entries_updated_at BEFORE UPDATE ON public.cash_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_advances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_entries;

-- Function to create a user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, name, role, phone, email, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 1)) || UPPER(LEFT(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), ' ', 2), 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample employees (these don't require auth users)
INSERT INTO public.employees (name, role, phone, email, avatar, weekly_salary, sessions_handled) VALUES
('Maria Santos', 'Senior Buyer', '+63917123456', 'maria@scrappy.com', 'MS', 5000.00, 15),
('Carlos Reyes', 'Logistics Coordinator', '+63918234567', 'carlos@scrappy.com', 'CR', 4500.00, 12),
('Ana Lopez', 'Quality Inspector', '+63919345678', 'ana@scrappy.com', 'AL', 4000.00, 8)
ON CONFLICT DO NOTHING;
