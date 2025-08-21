-- Create royalty_leaderboard table for caching leaderboard calculations
CREATE TABLE IF NOT EXISTS royalty_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Leaderboard identification
    time_period TEXT NOT NULL CHECK (time_period IN ('24h', '7d', '30d', 'all_time')),
    rank_position INTEGER NOT NULL,
    
    -- Royalty earner information
    royalty_earner_social_or_wallet TEXT NOT NULL,
    royalty_role TEXT, -- Most common role for this earner
    
    -- Earnings data
    total_earnings_sol DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_earnings_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
    payout_count INTEGER NOT NULL DEFAULT 0,
    
    -- Token information
    tokens_earned_from INTEGER NOT NULL DEFAULT 0, -- Number of unique tokens they earned from
    top_token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
    top_token_name TEXT,
    top_token_symbol TEXT,
    
    -- Time period data
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    average_payout_usd DECIMAL(20, 2),
    largest_single_payout_usd DECIMAL(20, 2),
    most_recent_payout_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combinations
    UNIQUE(time_period, rank_position, royalty_earner_social_or_wallet)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_royalty_leaderboard_time_period ON royalty_leaderboard(time_period);
CREATE INDEX IF NOT EXISTS idx_royalty_leaderboard_rank ON royalty_leaderboard(time_period, rank_position);
CREATE INDEX IF NOT EXISTS idx_royalty_leaderboard_earner ON royalty_leaderboard(royalty_earner_social_or_wallet);
CREATE INDEX IF NOT EXISTS idx_royalty_leaderboard_earnings ON royalty_leaderboard(time_period, total_earnings_usd DESC);
CREATE INDEX IF NOT EXISTS idx_royalty_leaderboard_last_updated ON royalty_leaderboard(last_updated DESC);

-- Create updated_at trigger for royalty_leaderboard
CREATE TRIGGER update_royalty_leaderboard_updated_at 
    BEFORE UPDATE ON royalty_leaderboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE royalty_leaderboard IS 'Cached royalty leaderboard calculations for different time periods';
COMMENT ON COLUMN royalty_leaderboard.time_period IS 'Time period: 24h, 7d, 30d, or all_time';
COMMENT ON COLUMN royalty_leaderboard.rank_position IS 'Position in the leaderboard (1 = highest earner)';
COMMENT ON COLUMN royalty_leaderboard.royalty_earner_social_or_wallet IS 'The person who earned the royalties';
COMMENT ON COLUMN royalty_leaderboard.total_earnings_sol IS 'Total SOL earned in this time period';
COMMENT ON COLUMN royalty_leaderboard.total_earnings_usd IS 'Total USD earned in this time period';
COMMENT ON COLUMN royalty_leaderboard.payout_count IS 'Number of payouts received in this time period';
COMMENT ON COLUMN royalty_leaderboard.tokens_earned_from IS 'Number of unique tokens they earned royalties from';
COMMENT ON COLUMN royalty_leaderboard.top_token_id IS 'Token they earned the most from in this period';
COMMENT ON COLUMN royalty_leaderboard.average_payout_usd IS 'Average payout amount in USD';
COMMENT ON COLUMN royalty_leaderboard.largest_single_payout_usd IS 'Largest single payout in USD';
COMMENT ON COLUMN royalty_leaderboard.most_recent_payout_at IS 'Most recent payout timestamp';
COMMENT ON COLUMN royalty_leaderboard.last_updated IS 'When this leaderboard entry was last calculated';
