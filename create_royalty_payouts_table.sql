-- Create royalty_payouts table for tracking royalty claim transactions
CREATE TABLE IF NOT EXISTS royalty_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id UUID REFERENCES tokens(id) ON DELETE CASCADE NOT NULL,
    token_ownership_id UUID REFERENCES token_ownership(id) ON DELETE CASCADE NOT NULL,
    
    -- Claimer information
    claimer_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    claimer_wallet_address TEXT NOT NULL,
    claimer_social_handle TEXT, -- Social handle if available
    
    -- Royalty information
    royalty_earner_social_or_wallet TEXT NOT NULL, -- The person who earned the royalty
    royalty_role TEXT NOT NULL, -- e.g., "Creator", "Management", "Influencer"
    royalty_percentage DECIMAL(5,2) NOT NULL, -- Percentage they earned (0-100)
    
    -- Payout details
    payout_amount DECIMAL(20, 8) NOT NULL, -- Amount paid out in SOL
    payout_amount_usd DECIMAL(20, 2), -- USD equivalent at time of payout
    sol_price_at_payout DECIMAL(20, 8), -- SOL price when payout occurred
    
    -- Transaction details
    transaction_signature TEXT, -- Solana transaction signature
    transaction_status TEXT DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'confirmed', 'failed')),
    transaction_error TEXT, -- Error message if transaction failed
    
    -- Fee information
    network_fee DECIMAL(20, 8) DEFAULT 0, -- Network fee paid
    platform_fee DECIMAL(20, 8) DEFAULT 0, -- Platform fee taken
    
    -- Metadata
    claim_reason TEXT, -- Optional reason for the claim
    claim_notes TEXT, -- Additional notes
    payout_method TEXT DEFAULT 'wallet' CHECK (payout_method IN ('wallet', 'social_handle', 'other')),
    
    -- Timestamps
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_token_id ON royalty_payouts(token_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_token_ownership_id ON royalty_payouts(token_ownership_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_claimer_user_id ON royalty_payouts(claimer_user_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_claimer_wallet ON royalty_payouts(claimer_wallet_address);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_royalty_earner ON royalty_payouts(royalty_earner_social_or_wallet);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_transaction_status ON royalty_payouts(transaction_status);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_claimed_at ON royalty_payouts(claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_completed_at ON royalty_payouts(completed_at DESC);

-- Create updated_at trigger for royalty_payouts
CREATE TRIGGER update_royalty_payouts_updated_at 
    BEFORE UPDATE ON royalty_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE royalty_payouts IS 'Tracks all royalty payout transactions when users claim their earnings';
COMMENT ON COLUMN royalty_payouts.claimer_wallet_address IS 'Wallet address of the person claiming the royalty';
COMMENT ON COLUMN royalty_payouts.claimer_social_handle IS 'Social handle of the claimer (if different from wallet)';
COMMENT ON COLUMN royalty_payouts.royalty_earner_social_or_wallet IS 'The person who earned the royalty (from royalty_earners array)';
COMMENT ON COLUMN royalty_payouts.royalty_role IS 'Role of the royalty earner (Creator, Management, etc.)';
COMMENT ON COLUMN royalty_payouts.royalty_percentage IS 'Percentage of royalties this person earned';
COMMENT ON COLUMN royalty_payouts.payout_amount IS 'Amount paid out in SOL';
COMMENT ON COLUMN royalty_payouts.payout_amount_usd IS 'USD equivalent at time of payout';
COMMENT ON COLUMN royalty_payouts.transaction_signature IS 'Solana transaction signature for the payout';
COMMENT ON COLUMN royalty_payouts.transaction_status IS 'Status of the payout transaction';
COMMENT ON COLUMN royalty_payouts.network_fee IS 'Network fee paid for the transaction';
COMMENT ON COLUMN royalty_payouts.platform_fee IS 'Platform fee taken by SplitzFun';
COMMENT ON COLUMN royalty_payouts.claim_reason IS 'Optional reason for the claim';
COMMENT ON COLUMN royalty_payouts.payout_method IS 'Method used for payout (wallet, social_handle, etc.)';
COMMENT ON COLUMN royalty_payouts.claimed_at IS 'When the claim was initiated';
COMMENT ON COLUMN royalty_payouts.processed_at IS 'When the payout was processed';
COMMENT ON COLUMN royalty_payouts.completed_at IS 'When the payout was completed';
