-- Disable Row Level Security for products table
-- This allows the application to read/write without authentication restrictions
-- For production, you should implement proper RLS policies

ALTER TABLE products DISABLE ROW LEVEL SECURITY;
