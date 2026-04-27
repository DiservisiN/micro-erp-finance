-- Add type column to existing categories table
-- Run this migration to update the schema for dynamic categories

-- Add type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'type'
    ) THEN
        ALTER TABLE public.categories ADD COLUMN type text;
    END IF;
END $$;

-- Add check constraint for type values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_type_check'
    ) THEN
        ALTER TABLE public.categories 
        ADD CONSTRAINT categories_type_check CHECK (type IN ('inventory', 'expense'));
    END IF;
END $$;

-- Drop old unique constraint on name only
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_name_key'
    ) THEN
        ALTER TABLE public.categories DROP CONSTRAINT categories_name_key;
    END IF;
END $$;

-- Add new unique constraint on (name, type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_name_type_key'
    ) THEN
        ALTER TABLE public.categories 
        ADD CONSTRAINT categories_name_type_key UNIQUE (name, type);
    END IF;
END $$;

-- Create index on type for faster lookups
CREATE INDEX IF NOT EXISTS categories_type_idx ON public.categories(type);

-- Update existing categories to have 'inventory' type by default
-- (this is a safe default, users can change it in Settings)
UPDATE public.categories 
SET type = 'inventory' 
WHERE type IS NULL;

-- Make type column NOT NULL after updating existing rows
ALTER TABLE public.categories ALTER COLUMN type SET NOT NULL;

-- Insert default expense categories if they don't exist
INSERT INTO public.categories (name, type, description)
VALUES 
  ('Operational', 'expense', 'Rent, Utilities, Internet, etc.'),
  ('Supplies', 'expense', 'Office supplies, Equipment, etc.'),
  ('Personnel', 'expense', 'Salaries, Bonuses, etc.'),
  ('Marketing', 'expense', 'Ads, Promotions, etc.'),
  ('Transportation', 'expense', 'Fuel, Maintenance, etc.'),
  ('Miscellaneous', 'expense', 'Other expenses')
ON CONFLICT (name, type) DO NOTHING;
