-- Analytics Tables for Marketplace Analytics

-- Platform Revenue Table
CREATE TABLE IF NOT EXISTS platform_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    revenue_type VARCHAR(50) NOT NULL CHECK (revenue_type IN ('sale_fee', 'token_fee', 'auction_fee', 'listing_fee')),
    amount_sol DECIMAL(20, 9) NOT NULL,
    transaction_hash VARCHAR(255),
    sale_id UUID REFERENCES marketplace_sales(id),
    auction_id UUID REFERENCES marketplace_auctions(id),
    listing_id UUID REFERENCES marketplace_listings(id),
    token_id UUID REFERENCES tokens(id),
    user_id UUID REFERENCES profiles(id),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auction Bids Table
CREATE TABLE IF NOT EXISTS auction_bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES marketplace_auctions(id) ON DELETE CASCADE,
    bidder_user_id UUID NOT NULL REFERENCES profiles(id),
    bid_amount DECIMAL(20, 9) NOT NULL,
    bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_winning_bid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Cache Table for Performance
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Views for Performance
CREATE OR REPLACE VIEW auction_analytics AS
SELECT 
    a.id,
    a.status,
    a.starting_bid,
    a.reserve_price,
    a.winning_bid,
    a.auction_start,
    a.auction_end,
    a.ended_at,
    a.created_at,
    t.name as token_name,
    t.symbol as token_symbol,
    p.username as seller_username,
    COUNT(ab.id) as total_bids,
    COUNT(DISTINCT ab.bidder_user_id) as unique_bidders,
    CASE 
        WHEN a.status = 'sold' THEN EXTRACT(EPOCH FROM (a.ended_at - a.auction_start)) / 3600
        ELSE NULL
    END as duration_hours
FROM marketplace_auctions a
LEFT JOIN tokens t ON a.token_id = t.id
LEFT JOIN profiles p ON a.seller_user_id = p.id
LEFT JOIN auction_bids ab ON a.id = ab.auction_id
GROUP BY a.id, t.name, t.symbol, p.username;

CREATE OR REPLACE VIEW offer_analytics AS
SELECT 
    o.id,
    o.status,
    o.offer_amount,
    o.counter_amount,
    o.created_at,
    o.updated_at,
    t.name as token_name,
    t.symbol as token_symbol,
    buyer.username as buyer_username,
    seller.username as seller_username,
    EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600 as time_to_resolution_hours
FROM marketplace_offers o
LEFT JOIN marketplace_listings ml ON o.listing_id = ml.id
LEFT JOIN tokens t ON ml.token_id = t.id
LEFT JOIN profiles buyer ON o.buyer_user_id = buyer.id
LEFT JOIN profiles seller ON ml.seller_user_id = seller.id;

CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
    pr.id,
    pr.revenue_type,
    pr.amount_sol,
    pr.collected_at,
    pr.created_at,
    t.name as token_name,
    t.symbol as token_symbol,
    p.username as user_username
FROM platform_revenue pr
LEFT JOIN tokens t ON pr.token_id = t.id
LEFT JOIN profiles p ON pr.user_id = p.id;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_collected_at ON platform_revenue(collected_at);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_user_id ON platform_revenue(user_id);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_user_id ON auction_bids(bidder_user_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bid_time ON auction_bids(bid_time);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON analytics_cache(expires_at);

-- RLS Policies
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Platform Revenue Policies
CREATE POLICY "Platform revenue is viewable by authenticated users" ON platform_revenue
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Platform revenue is insertable by service role" ON platform_revenue
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Auction Bids Policies
CREATE POLICY "Auction bids are viewable by authenticated users" ON auction_bids
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own bids" ON auction_bids
    FOR INSERT WITH CHECK (auth.uid() = bidder_user_id);

CREATE POLICY "Users can update their own bids" ON auction_bids
    FOR UPDATE USING (auth.uid() = bidder_user_id);

-- Analytics Cache Policies
CREATE POLICY "Analytics cache is viewable by authenticated users" ON analytics_cache
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Analytics cache is manageable by service role" ON analytics_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Grants
GRANT SELECT ON platform_revenue TO authenticated;
GRANT SELECT ON auction_bids TO authenticated;
GRANT SELECT ON analytics_cache TO authenticated;
GRANT ALL ON platform_revenue TO service_role;
GRANT ALL ON auction_bids TO service_role;
GRANT ALL ON analytics_cache TO service_role;

-- Grant access to views
GRANT SELECT ON auction_analytics TO authenticated;
GRANT SELECT ON offer_analytics TO authenticated;
GRANT SELECT ON revenue_analytics TO authenticated;
