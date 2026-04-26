-- Add expense support to transactions table
-- This SQL ensures the transactions table can handle expense transactions

-- Add category column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN category text;
    END IF;
END $$;

-- Add expense_category column for more detailed categorization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'expense_category'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN expense_category text;
    END IF;
END $$;

-- Create index on expense_category for faster filtering
CREATE INDEX IF NOT EXISTS transactions_expense_category_idx ON public.transactions(expense_category);

-- Create index on type for filtering income vs expenses
CREATE INDEX IF NOT EXISTS transactions_type_idx ON public.transactions(type);

-- Common expense categories
-- You can use these values in the expense_category field:
-- - Operational (Rent, Utilities, Internet, etc.)
-- - Supplies (Office supplies, Equipment, etc.)
-- - Personnel (Salaries, Bonuses, etc.)
-- - Marketing (Ads, Promotions, etc.)
-- - Transportation (Fuel, Maintenance, etc.)
-- - Miscellaneous (Other expenses)
