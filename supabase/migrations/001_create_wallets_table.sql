-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('business', 'personal')),
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('Bank', 'E-Wallet', 'Cash')),
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (for now - restrict to authenticated users in production)
CREATE POLICY "Enable all access for wallets" ON wallets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallets_updated_at();
