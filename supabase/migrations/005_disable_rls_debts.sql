-- Disable Row Level Security for debts table
-- This allows the application to read/write without authentication restrictions
-- For production, you should implement proper RLS policies

ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
