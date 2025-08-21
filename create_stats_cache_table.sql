-- Create stats_cache table for pre-calculated statistics
CREATE TABLE IF NOT EXISTS stats_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Stat identification
    stat_key TEXT UNIQUE NOT NULL,
    stat_name TEXT NOT NULL,
    
    -- Stat values
    value_numeric DECIMAL(20, 8),
    value_text TEXT,
    value_json JSONB,
    
    -- Metadata
    description TEXT,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_update TIMESTAMP WITH TIME ZONE,
    update_frequency_minutes INTEGER DEFAULT 5,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stats_cache_key ON stats_cache(stat_key);
CREATE INDEX IF NOT EXISTS idx_stats_cache_next_update ON stats_cache(next_update);

-- Create updated_at trigger for stats_cache
CREATE TRIGGER update_stats_cache_updated_at 
    BEFORE UPDATE ON stats_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial stats
INSERT INTO stats_cache (stat_key, stat_name, value_numeric, value_text, description, update_frequency_minutes) VALUES
('total_royalties_claimed_usd', 'Total Royalties Claimed (USD)', 0, '$0', 'Total USD value of all confirmed royalty payouts', 5),
('total_tokens_launched', 'Total Tokens Launched', 0, '0', 'Total count of tokens in the tokens table', 5),
('total_active_holders', 'Total Active Holders', 0, '0', 'Sum of all holder_count values from token_statistics', 5),
('total_royalty_earners', 'Total Royalty Earners', 0, '0', 'Count of unique royalty earners', 5),
('average_earnings_per_earner', 'Average Earnings per Earner', 0, '$0', 'Average USD earnings per royalty earner', 5),
('top_earner_this_week', 'Top Earner This Week', 0, 'None', 'Highest earning royalty earner in the last 7 days', 5),
('total_payouts_this_week', 'Total Payouts This Week', 0, '0', 'Number of royalty payouts in the last 7 days', 5),
('platform_fees_collected', 'Platform Fees Collected', 0, '$0', 'Total platform fees collected from royalty payouts', 5),
('leaderboard_24h', 'Leaderboard 24 Hours', 0, '[]', 'Top 50 royalty earners for the last 24 hours', 5),
('leaderboard_7d', 'Leaderboard 7 Days', 0, '[]', 'Top 50 royalty earners for the last 7 days', 5),
('leaderboard_30d', 'Leaderboard 30 Days', 0, '[]', 'Top 50 royalty earners for the last 30 days', 5),
('leaderboard_all_time', 'Leaderboard All Time', 0, '[]', 'Top 50 royalty earners of all time', 5),
('total_royalties_earned', 'Total Royalties Earned', 0, '$0', 'Total fees earned across all tokens (from token_ownership)', 5),
('total_royalties_distributed', 'Total Royalties Distributed', 0, '$0', 'Total USD value of all confirmed royalty payouts', 5),
('total_earners', 'Total Earners', 0, '0', 'Count of unique royalty earners who have received payouts', 5),
('top_earner', 'Top Earner', 0, 'None', 'Highest earning royalty earner of all time', 5)
ON CONFLICT (stat_key) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE stats_cache IS 'Cached pre-calculated statistics for instant loading';
COMMENT ON COLUMN stats_cache.stat_key IS 'Unique identifier for the stat (e.g., total_royalties_claimed_usd)';
COMMENT ON COLUMN stats_cache.stat_name IS 'Human readable name for the stat';
COMMENT ON COLUMN stats_cache.value_numeric IS 'Numeric value of the stat';
COMMENT ON COLUMN stats_cache.value_text IS 'Formatted text value of the stat';
COMMENT ON COLUMN stats_cache.value_json IS 'JSON value for complex stats';
COMMENT ON COLUMN stats_cache.last_calculated IS 'When this stat was last calculated';
COMMENT ON COLUMN stats_cache.next_update IS 'When this stat should be updated next';
COMMENT ON COLUMN stats_cache.update_frequency_minutes IS 'How often to update this stat (in minutes)';
