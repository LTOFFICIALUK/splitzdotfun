-- Create explore_page table for caching token data from Jupiter API
CREATE TABLE IF NOT EXISTS explore_page (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id UUID REFERENCES tokens(id) ON DELETE CASCADE NOT NULL,
    contract_address TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    image_url TEXT,
    market_cap DECIMAL(20, 8),
    volume_24h DECIMAL(20, 8),
    price DECIMAL(20, 8),
    price_change_24h DECIMAL(10, 4), -- Percentage change
    social_link TEXT, -- X/Twitter link from our tokens table
    website_link TEXT, -- Website link if available
    solscan_link TEXT, -- Generated Solscan link
    category TEXT NOT NULL DEFAULT 'new', -- 'new', '24h', 'older'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_explore_page_token_id ON explore_page(token_id);
CREATE INDEX IF NOT EXISTS idx_explore_page_contract_address ON explore_page(contract_address);
CREATE INDEX IF NOT EXISTS idx_explore_page_category ON explore_page(category);
CREATE INDEX IF NOT EXISTS idx_explore_page_last_updated ON explore_page(last_updated);
CREATE INDEX IF NOT EXISTS idx_explore_page_market_cap ON explore_page(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_explore_page_volume_24h ON explore_page(volume_24h DESC);

-- Add unique constraint on token_id for upsert operations (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'explore_page_token_id_unique'
  ) THEN
    ALTER TABLE explore_page ADD CONSTRAINT explore_page_token_id_unique UNIQUE (token_id);
  END IF;
END $$;

-- Create updated_at trigger for explore_page (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_explore_page_last_updated'
  ) THEN
    CREATE TRIGGER update_explore_page_last_updated 
      BEFORE UPDATE ON explore_page 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Drop the incorrect trigger if it exists and recreate with correct field
DROP TRIGGER IF EXISTS update_explore_page_last_updated ON explore_page;

-- Create a custom trigger function for last_updated
CREATE OR REPLACE FUNCTION update_explore_page_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_explore_page_last_updated 
  BEFORE UPDATE ON explore_page 
  FOR EACH ROW 
  EXECUTE FUNCTION update_explore_page_last_updated();

-- Add comments for documentation
COMMENT ON TABLE explore_page IS 'Cached token data from Jupiter API for fast explore page loading';
COMMENT ON COLUMN explore_page.category IS 'Token category: new (recently created), 24h (active in last 24h), older (established tokens)';
COMMENT ON COLUMN explore_page.market_cap IS 'Market capitalization in USD';
COMMENT ON COLUMN explore_page.volume_24h IS '24-hour trading volume in USD';
COMMENT ON COLUMN explore_page.price_change_24h IS '24-hour price change percentage';
COMMENT ON COLUMN explore_page.solscan_link IS 'Generated Solscan explorer link for the token';

-- Enable RLS for explore_page
ALTER TABLE explore_page ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for explore_page (public read access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'explore_page' AND policyname = 'Public read explore page'
  ) THEN
    CREATE POLICY "Public read explore page" ON explore_page
      FOR SELECT USING (true);
  END IF;
END $$;
