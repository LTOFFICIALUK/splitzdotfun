-- Comprehensive Analytics Tables Setup
-- This file creates all necessary tables for the analytics system

-- Platform Revenue Table - Track all platform revenue
-- Note: This table already exists with different structure, so we'll work with existing columns
-- Existing columns: id, sale_id, auction_id, revenue_type, amount_sol, amount_usd, collection_date, status, transaction_signature, created_at

-- Token Fee Periods Table - Track 7-day fee collection periods after sales
-- Note: This table already exists with different structure, so we'll work with existing columns
-- Existing columns: id, sale_id, token_id, period_start, period_end, total_fees_generated, platform_fee_collected, platform_fee_percentage, status, created_at, updated_at

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

-- Add platform fee tracking to marketplace_sales (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketplace_sales') THEN
    ALTER TABLE marketplace_sales 
    ADD COLUMN IF NOT EXISTS platform_fee_lamports BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS platform_fee_sol DECIMAL(20,8) GENERATED ALWAYS AS (platform_fee_lamports / 1000000000.0) STORED,
    ADD COLUMN IF NOT EXISTS seller_amount_lamports BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS seller_amount_sol DECIMAL(20,8) GENERATED ALWAYS AS (seller_amount_lamports / 1000000000.0) STORED,
    ADD COLUMN IF NOT EXISTS fee_period_created BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_collection_date ON platform_revenue(collection_date);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_sale_id ON platform_revenue(sale_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_auction_id ON platform_revenue(auction_id);

CREATE INDEX IF NOT EXISTS idx_token_fee_periods_token ON token_fee_periods(token_id);
CREATE INDEX IF NOT EXISTS idx_token_fee_periods_sale ON token_fee_periods(sale_id);
CREATE INDEX IF NOT EXISTS idx_token_fee_periods_status ON token_fee_periods(status);
CREATE INDEX IF NOT EXISTS idx_token_fee_periods_period ON token_fee_periods(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_user_id ON auction_bids(bidder_user_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bid_time ON auction_bids(bid_time);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON analytics_cache(expires_at);

-- Analytics Views for Performance (only create if required tables exist)
DO $$
BEGIN
  -- Only create auction_analytics view if marketplace_auctions table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketplace_auctions') THEN
    EXECUTE 'CREATE OR REPLACE VIEW auction_analytics AS
    SELECT 
        a.id,
        a.status,
        a.starting_bid,
        a.reserve_price,
        a.winning_bid,
        a.auction_start,
        a.auction_end,
        a.created_at,
        t.name as token_name,
        t.symbol as token_symbol,
        p.username as seller_username,
        COUNT(ab.id) as total_bids,
        COUNT(DISTINCT ab.bidder_user_id) as unique_bidders,
        CASE 
            WHEN a.status = ''sold'' THEN EXTRACT(EPOCH FROM (a.auction_end - a.auction_start)) / 3600
            ELSE NULL
        END as duration_hours
    FROM marketplace_auctions a
    LEFT JOIN tokens t ON a.token_id = t.id
    LEFT JOIN profiles p ON a.seller_user_id = p.id
    LEFT JOIN auction_bids ab ON a.id = ab.auction_id
    GROUP BY a.id, t.name, t.symbol, p.username';
  END IF;
END $$;

DO $$
BEGIN
  -- Only create offer_analytics view if marketplace_offers table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketplace_offers') THEN
    EXECUTE 'CREATE OR REPLACE VIEW offer_analytics AS
    SELECT 
        o.id,
        o.status,
        o.offer_amount,
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
    LEFT JOIN profiles seller ON ml.seller_user_id = seller.id';
  END IF;
END $$;

-- Create revenue_analytics view that works with existing platform_revenue structure
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
    pr.id,
    pr.revenue_type,
    pr.amount_sol,
    pr.amount_usd,
    COALESCE(pr.collection_date, pr.created_at) as collected_at,
    pr.created_at,
    pr.sale_id,
    pr.auction_id,
    pr.status,
    pr.transaction_signature,
    -- Get token info from sale or auction
    COALESCE(
        (SELECT t.name FROM marketplace_sales ms JOIN tokens t ON ms.token_id = t.id WHERE ms.id = pr.sale_id),
        (SELECT t.name FROM marketplace_auctions ma JOIN tokens t ON ma.token_id = t.id WHERE ma.id = pr.auction_id),
        'Unknown'
    ) as token_name,
    COALESCE(
        (SELECT t.symbol FROM marketplace_sales ms JOIN tokens t ON ms.token_id = t.id WHERE ms.id = pr.sale_id),
        (SELECT t.symbol FROM marketplace_auctions ma JOIN tokens t ON ma.token_id = t.id WHERE ma.id = pr.auction_id),
        'UNK'
    ) as token_symbol
FROM platform_revenue pr;

-- Views for analytics
CREATE OR REPLACE VIEW platform_revenue_summary AS
SELECT 
  revenue_type,
  DATE_TRUNC('day', COALESCE(collection_date, created_at)) as date,
  COUNT(*) as transaction_count,
  SUM(amount_sol) as total_sol,
  SUM(amount_usd) as total_usd
FROM platform_revenue 
WHERE status = 'collected'
GROUP BY revenue_type, DATE_TRUNC('day', COALESCE(collection_date, created_at))
ORDER BY date DESC, revenue_type;

DO $$
BEGIN
  -- Only create token_fee_periods_summary view if token_fee_periods table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'token_fee_periods') THEN
    EXECUTE 'CREATE OR REPLACE VIEW token_fee_periods_summary AS
    SELECT 
      t.name as token_name,
      t.symbol as token_symbol,
      tfp.period_start,
      tfp.period_end,
      tfp.total_fees_generated,
      tfp.platform_fee_collected,
      tfp.platform_fee_percentage,
      tfp.status,
      ms.sale_price_sol as original_sale_price
    FROM token_fee_periods tfp
    JOIN tokens t ON t.id = tfp.token_id
    JOIN marketplace_sales ms ON ms.id = tfp.sale_id
    ORDER BY tfp.period_start DESC';
  END IF;
END $$;

-- Functions for revenue calculations
CREATE OR REPLACE FUNCTION calculate_platform_fee(sale_price_lamports BIGINT)
RETURNS BIGINT AS $$
BEGIN
  -- 10% platform fee
  RETURN (sale_price_lamports * 10) / 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_seller_amount(sale_price_lamports BIGINT)
RETURNS BIGINT AS $$
BEGIN
  -- 90% to seller (after 10% platform fee)
  RETURN (sale_price_lamports * 90) / 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RLS Policies
ALTER TABLE token_fee_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Token Fee Periods Policies
CREATE POLICY "Token fee periods are viewable by authenticated users" ON token_fee_periods
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Token fee periods are manageable by service role" ON token_fee_periods
    FOR ALL USING (auth.role() = 'service_role');

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
GRANT SELECT ON token_fee_periods TO authenticated;
GRANT SELECT ON auction_bids TO authenticated;
GRANT SELECT ON analytics_cache TO authenticated;
GRANT ALL ON token_fee_periods TO service_role;
GRANT ALL ON auction_bids TO service_role;
GRANT ALL ON analytics_cache TO service_role;

-- Grant access to views
GRANT SELECT ON auction_analytics TO authenticated;
GRANT SELECT ON offer_analytics TO authenticated;
GRANT SELECT ON revenue_analytics TO authenticated;
GRANT SELECT ON platform_revenue_summary TO authenticated;
GRANT SELECT ON token_fee_periods_summary TO authenticated;
