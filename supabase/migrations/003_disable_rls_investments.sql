-- Disable Row Level Security for investments table
-- This allows the application to read/write without authentication restrictions
-- For production, you should implement proper RLS policies

ALTER TABLE investments DISABLE ROW LEVEL SECURITY;
