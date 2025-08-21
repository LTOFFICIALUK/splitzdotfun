-- Drop existing stats_cache table and recreate with new time-period stats
DROP TABLE IF EXISTS stats_cache CASCADE;

-- Create the stats_cache table
CREATE TABLE stats_cache (
    id BIGSERIAL PRIMARY KEY,
    stat_key VARCHAR(100) UNIQUE NOT NULL,
    stat_name VARCHAR(200) NOT NULL,
    value_numeric DECIMAL(20, 8),
    value_text TEXT,
    value_json JSONB,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    update_frequency_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_stats_cache_key ON stats_cache(stat_key);
CREATE INDEX idx_stats_cache_next_update ON stats_cache(next_update);
CREATE INDEX idx_stats_cache_last_calculated ON stats_cache(last_calculated);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_stats_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_cache_updated_at
    BEFORE UPDATE ON stats_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_cache_updated_at();

-- Insert initial stats with new time-period specific stats
INSERT INTO stats_cache (stat_key, stat_name, value_numeric, value_text, value_json, update_frequency_minutes) VALUES
('total_royalties_claimed_usd', 'Total Royalties Claimed (USD)', 0, '$0', '{"description": "Total USD value of all confirmed royalty payouts"}', 5),
('total_tokens_launched', 'Total Tokens Launched', 0, '0', '{"description": "Count of all tokens in the tokens table"}', 5),
('total_active_holders', 'Total Active Holders', 0, '0', '{"description": "Sum of holder_count from token_statistics table"}', 5),
('total_royalty_earners', 'Total Royalty Earners', 0, '0', '{"description": "Count of unique royalty earners"}', 5),
('average_earnings_per_earner', 'Average Earnings Per Earner', 0, '$0', '{"description": "Average earnings per royalty earner"}', 5),
('top_earner_this_week', 'Top Earner This Week', 0, 'None', '{"description": "Highest earning royalty earner this week"}', 5),
('total_payouts_this_week', 'Total Payouts This Week', 0, '0', '{"description": "Total number of payouts this week"}', 5),
('platform_fees_collected', 'Platform Fees Collected', 0, '$0', '{"description": "Total platform fees collected"}', 5),
('leaderboard_24h', 'Leaderboard 24 Hours', 0, '[]', '{"description": "Top royalty earners for last 24 hours"}', 5),
('leaderboard_7d', 'Leaderboard 7 Days', 0, '[]', '{"description": "Top royalty earners for last 7 days"}', 5),
('leaderboard_30d', 'Leaderboard 30 Days', 0, '[]', '{"description": "Top royalty earners for last 30 days"}', 5),
('leaderboard_all_time', 'Leaderboard All Time', 0, '[]', '{"description": "Top royalty earners of all time"}', 5),
('total_royalties_earned', 'Total Royalties Earned', 0, '$0', '{"description": "Total fees earned across all tokens (from token_ownership)"}', 5),
('total_royalties_distributed', 'Total Royalties Distributed', 0, '$0', '{"description": "Total USD value of all confirmed royalty payouts"}', 5),
('total_earners', 'Total Earners', 0, '0', '{"description": "Count of unique royalty earners who have received payouts"}', 5),
('top_earner', 'Top Earner', 0, 'None', '{"description": "Highest earning royalty earner of all time"}', 5),
('stats_24h', 'Stats 24 Hours', 0, '{}', '{"description": "Time-period specific stats for last 24 hours"}', 5),
('stats_7d', 'Stats 7 Days', 0, '{}', '{"description": "Time-period specific stats for last 7 days"}', 5),
('stats_30d', 'Stats 30 Days', 0, '{}', '{"description": "Time-period specific stats for last 30 days"}', 5),
('stats_all_time', 'Stats All Time', 0, '{}', '{"description": "Time-period specific stats for all time"}', 5),
('marketplace_total_volume_sol', 'Marketplace Total Volume SOL', 0, '0 SOL', '{"description": "Total SOL volume from all marketplace sales"}', 5),
('marketplace_total_volume_usd', 'Marketplace Total Volume USD', 0, '$0', '{"description": "Total USD volume from all marketplace sales"}', 5),
('marketplace_total_sales', 'Marketplace Total Sales', 0, '0', '{"description": "Total number of marketplace sales"}', 5),
('marketplace_average_sale_time', 'Marketplace Average Sale Time', 0, 'N/A', '{"description": "Average time to sell in minutes"}', 5)
ON CONFLICT (stat_key) DO NOTHING;
