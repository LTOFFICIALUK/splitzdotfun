-- Create token_statistics table for storing Jupiter API data
CREATE TABLE IF NOT EXISTS token_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id UUID REFERENCES tokens(id) ON DELETE CASCADE NOT NULL,
    contract_address TEXT NOT NULL,
    
    -- Jupiter API data fields
    jupiter_id TEXT,
    name TEXT,
    symbol TEXT,
    icon TEXT,
    decimals INTEGER,
    dev TEXT,
    circ_supply DECIMAL(30, 9),
    total_supply DECIMAL(30, 9),
    token_program TEXT,
    launchpad TEXT,
    meta_launchpad TEXT,
    partner_config TEXT,
    holder_count INTEGER,
    
    -- Audit data
    mint_authority_disabled BOOLEAN,
    freeze_authority_disabled BOOLEAN,
    top_holders_percentage DECIMAL(10, 6),
    dev_migrations INTEGER,
    
    -- Scores and verification
    organic_score DECIMAL(10, 6),
    organic_score_label TEXT,
    is_verified BOOLEAN,
    tags TEXT[],
    
    -- Financial data
    fdv DECIMAL(20, 6),
    mcap DECIMAL(20, 6),
    usd_price DECIMAL(20, 9),
    price_block_id BIGINT,
    liquidity DECIMAL(20, 6),
    
    -- Social data
    ct_likes INTEGER,
    smart_ct_likes INTEGER,
    
    -- Statistics (5m, 1h, 6h, 24h)
    stats_5m JSONB,
    stats_1h JSONB,
    stats_6h JSONB,
    stats_24h JSONB,
    
    -- Metadata
    jupiter_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per token
    UNIQUE(token_id, contract_address)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_token_statistics_contract_address ON token_statistics(contract_address);
CREATE INDEX IF NOT EXISTS idx_token_statistics_token_id ON token_statistics(token_id);
CREATE INDEX IF NOT EXISTS idx_token_statistics_updated_at ON token_statistics(updated_at);
CREATE INDEX IF NOT EXISTS idx_token_statistics_mcap ON token_statistics(mcap DESC);
CREATE INDEX IF NOT EXISTS idx_token_statistics_liquidity ON token_statistics(liquidity DESC);
CREATE INDEX IF NOT EXISTS idx_token_statistics_holder_count ON token_statistics(holder_count DESC);

-- Create updated_at trigger for token_statistics
CREATE TRIGGER update_token_statistics_updated_at 
    BEFORE UPDATE ON token_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE token_statistics IS 'Stores Jupiter API token statistics for efficient querying';
COMMENT ON COLUMN token_statistics.jupiter_id IS 'Jupiter API token ID';
COMMENT ON COLUMN token_statistics.stats_5m IS '5-minute statistics from Jupiter API';
COMMENT ON COLUMN token_statistics.stats_1h IS '1-hour statistics from Jupiter API';
COMMENT ON COLUMN token_statistics.stats_6h IS '6-hour statistics from Jupiter API';
COMMENT ON COLUMN token_statistics.stats_24h IS '24-hour statistics from Jupiter API';
COMMENT ON COLUMN token_statistics.jupiter_updated_at IS 'Last update time from Jupiter API';
