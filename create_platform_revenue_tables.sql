-- Platform Revenue System Database Schema
-- This file creates tables for tracking platform revenue from marketplace sales and token fees

-- Platform Revenue Table - Track all platform revenue
CREATE TABLE IF NOT EXISTS platform_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  revenue_type VARCHAR(50) NOT NULL CHECK (revenue_type IN ('sale_fee', 'token_fee')),
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports > 0),
  amount_sol DECIMAL(20,8) GENERATED ALWAYS AS (amount_lamports / 1000000000.0) STORED,
  source_sale_id UUID REFERENCES marketplace_sales(id),
  source_token_id UUID REFERENCES tokens(id),
  fee_period_id UUID REFERENCES token_fee_periods(id),
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_signature VARCHAR(255),
  status VARCHAR(20) DEFAULT 'collected' CHECK (status IN ('collected', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token Fee Periods Table - Track 7-day fee collection periods after sales
CREATE TABLE IF NOT EXISTS token_fee_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES tokens(id),
  sale_id UUID NOT NULL REFERENCES marketplace_sales(id),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  fee_percentage DECIMAL(5,2) DEFAULT 10.00 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  total_fees_generated_lamports BIGINT DEFAULT 0,
  total_fees_generated_sol DECIMAL(20,8) GENERATED ALWAYS AS (total_fees_generated_lamports / 1000000000.0) STORED,
  platform_fee_collected_lamports BIGINT DEFAULT 0,
  platform_fee_collected_sol DECIMAL(20,8) GENERATED ALWAYS AS (platform_fee_collected_lamports / 1000000000.0) STORED,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active period per token at a time
  CONSTRAINT unique_active_token_period UNIQUE (token_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Add platform fee tracking to marketplace_sales
ALTER TABLE marketplace_sales 
ADD COLUMN IF NOT EXISTS platform_fee_lamports BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_sol DECIMAL(20,8) GENERATED ALWAYS AS (platform_fee_lamports / 1000000000.0) STORED,
ADD COLUMN IF NOT EXISTS seller_amount_lamports BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_amount_sol DECIMAL(20,8) GENERATED ALWAYS AS (seller_amount_lamports / 1000000000.0) STORED,
ADD COLUMN IF NOT EXISTS fee_period_created BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_collected_at ON platform_revenue(collected_at);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source_sale ON platform_revenue(source_sale_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source_token ON platform_revenue(source_token_id);

CREATE INDEX IF NOT EXISTS idx_token_fee_periods_token ON token_fee_periods(token_id);
CREATE INDEX IF NOT EXISTS idx_token_fee_periods_sale ON token_fee_periods(sale_id);
CREATE INDEX IF NOT EXISTS idx_token_fee_periods_status ON token_fee_periods(status);
CREATE INDEX IF NOT EXISTS idx_token_fee_periods_period ON token_fee_periods(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_marketplace_sales_platform_fee ON marketplace_sales(platform_fee_lamports);
CREATE INDEX IF NOT EXISTS idx_marketplace_sales_fee_period ON marketplace_sales(fee_period_created);

-- Views for analytics
CREATE OR REPLACE VIEW platform_revenue_summary AS
SELECT 
  revenue_type,
  DATE_TRUNC('day', collected_at) as date,
  COUNT(*) as transaction_count,
  SUM(amount_lamports) as total_lamports,
  SUM(amount_sol) as total_sol
FROM platform_revenue 
WHERE status = 'collected'
GROUP BY revenue_type, DATE_TRUNC('day', collected_at)
ORDER BY date DESC, revenue_type;

CREATE OR REPLACE VIEW token_fee_periods_summary AS
SELECT 
  t.name as token_name,
  t.symbol as token_symbol,
  tfp.period_start,
  tfp.period_end,
  tfp.total_fees_generated_sol,
  tfp.platform_fee_collected_sol,
  tfp.status,
  ms.sale_price_sol as original_sale_price
FROM token_fee_periods tfp
JOIN tokens t ON t.id = tfp.token_id
JOIN marketplace_sales ms ON ms.id = tfp.sale_id
ORDER BY tfp.period_start DESC;

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

-- Trigger to automatically create fee period when sale is completed
CREATE OR REPLACE FUNCTION create_token_fee_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create fee period if sale is completed and fee period not already created
  IF NEW.status = 'completed' AND NOT NEW.fee_period_created THEN
    INSERT INTO token_fee_periods (
      token_id,
      sale_id,
      period_start,
      period_end,
      fee_percentage
    ) VALUES (
      NEW.token_id,
      NEW.id,
      NEW.completed_at,
      NEW.completed_at + INTERVAL '7 days',
      10.00
    );
    
    -- Mark fee period as created
    NEW.fee_period_created = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_create_token_fee_period') THEN
    CREATE TRIGGER trg_create_token_fee_period
      AFTER UPDATE ON marketplace_sales
      FOR EACH ROW
      EXECUTE FUNCTION create_token_fee_period();
  END IF;
END $$;

-- RLS Policies
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_fee_periods ENABLE ROW LEVEL SECURITY;

-- Allow read access to platform revenue (admin only in practice)
CREATE POLICY "Allow read platform revenue" ON platform_revenue
  FOR SELECT USING (true);

-- Allow read access to token fee periods
CREATE POLICY "Allow read token fee periods" ON token_fee_periods
  FOR SELECT USING (true);

-- Comments for documentation
COMMENT ON TABLE platform_revenue IS 'Tracks all platform revenue from marketplace sales and token fees';
COMMENT ON TABLE token_fee_periods IS 'Tracks 7-day fee collection periods after token sales';
COMMENT ON COLUMN marketplace_sales.platform_fee_lamports IS '10% platform fee deducted from sale price';
COMMENT ON COLUMN marketplace_sales.seller_amount_lamports IS '90% of sale price paid to seller';
COMMENT ON COLUMN marketplace_sales.fee_period_created IS 'Whether a token fee period was created for this sale';
