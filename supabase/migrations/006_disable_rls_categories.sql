-- Disable Row Level Security for categories table
-- This allows the application to read/write without authentication restrictions
-- For production, you should implement proper RLS policies

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
