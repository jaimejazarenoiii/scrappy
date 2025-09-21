-- Add business_id column to employees table if it doesn't exist
-- This fixes the "Could not find the 'businessId' column" error

-- Add business_id column to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Set default value for existing records
UPDATE public.employees 
SET business_id = '00000000-0000-0000-0000-000000000001' 
WHERE business_id IS NULL;

-- Make business_id NOT NULL after setting defaults
ALTER TABLE public.employees ALTER COLUMN business_id SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON public.employees(business_id);

-- Add comment for documentation
COMMENT ON COLUMN public.employees.business_id IS 'Business this employee belongs to';
