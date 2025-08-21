-- Create marketplace_sales table to track all token sales
CREATE TABLE marketplace_sales (
    id BIGSERIAL PRIMARY KEY,
    
    -- Token details
    token_id BIGINT REFERENCES tokens(id) ON DELETE CASCADE,
    token_name VARCHAR(255),
    token_symbol VARCHAR(50),
    contract_address VARCHAR(255),
    
    -- Listing details
    listing_id BIGINT, -- Reference to the original listing
    listing_time TIMESTAMP WITH TIME ZONE,
    listing_price_sol DECIMAL(20, 8),
    listing_price_usd DECIMAL(20, 2),
    
    -- Sale details
    sale_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_to_sell_minutes INTEGER, -- Calculated field
    sale_price_sol DECIMAL(20, 8) NOT NULL,
    sale_price_usd DECIMAL(20, 2),
    
    -- Transaction details
    transaction_hash VARCHAR(255),
    transaction_status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, pending, failed
    block_number BIGINT,
    
    -- Parties involved
    seller_wallet VARCHAR(255),
    seller_social_handle VARCHAR(255),
    buyer_wallet VARCHAR(255),
    buyer_social_handle VARCHAR(255),
    
    -- Financial details
    fees_sol DECIMAL(20, 8) DEFAULT 0,
    fees_usd DECIMAL(20, 2) DEFAULT 0,
    platform_fee_sol DECIMAL(20, 8) DEFAULT 0,
    platform_fee_usd DECIMAL(20, 2) DEFAULT 0,
    royalty_fee_sol DECIMAL(20, 8) DEFAULT 0,
    royalty_fee_usd DECIMAL(20, 2) DEFAULT 0,
    
    -- Royalty earners (before and after sale)
    old_royalty_earners JSONB, -- Array of previous royalty earners
    new_royalty_earners JSONB, -- Array of new royalty earners after sale
    royalty_earners_changed BOOLEAN DEFAULT FALSE,
    
    -- Market data
    market_cap_at_sale DECIMAL(20, 8),
    holder_count_at_sale INTEGER,
    volume_24h_at_sale DECIMAL(20, 8),
    
    -- Metadata
    sale_type VARCHAR(50) DEFAULT 'marketplace', -- marketplace, auction, direct
    payment_method VARCHAR(50) DEFAULT 'sol', -- sol, usdc, etc.
    is_verified_sale BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_marketplace_sales_token_id ON marketplace_sales(token_id);
CREATE INDEX idx_marketplace_sales_sale_time ON marketplace_sales(sale_time);
CREATE INDEX idx_marketplace_sales_seller_wallet ON marketplace_sales(seller_wallet);
CREATE INDEX idx_marketplace_sales_buyer_wallet ON marketplace_sales(buyer_wallet);
CREATE INDEX idx_marketplace_sales_transaction_hash ON marketplace_sales(transaction_hash);
CREATE INDEX idx_marketplace_sales_status ON marketplace_sales(transaction_status);
CREATE INDEX idx_marketplace_sales_price_sol ON marketplace_sales(sale_price_sol);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_marketplace_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_sales_updated_at
    BEFORE UPDATE ON marketplace_sales
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_sales_updated_at();

-- Create function to calculate time_to_sell_minutes
CREATE OR REPLACE FUNCTION calculate_time_to_sell()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_time IS NOT NULL AND NEW.sale_time IS NOT NULL THEN
        NEW.time_to_sell_minutes = EXTRACT(EPOCH FROM (NEW.sale_time - NEW.listing_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_time_to_sell_trigger
    BEFORE INSERT OR UPDATE ON marketplace_sales
    FOR EACH ROW
    EXECUTE FUNCTION calculate_time_to_sell();

-- Insert some sample data for testing (optional)
-- INSERT INTO marketplace_sales (
--     token_id, token_name, token_symbol, contract_address,
--     listing_time, listing_price_sol, sale_time, sale_price_sol,
--     seller_wallet, buyer_wallet, transaction_hash
-- ) VALUES (
--     1, 'Sample Token', 'SAMPLE', 'sample_contract_address',
--     NOW() - INTERVAL '2 hours', 10.5, NOW(), 12.0,
--     'seller_wallet_address', 'buyer_wallet_address', 'sample_tx_hash'
-- );
