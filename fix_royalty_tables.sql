-- Fix Royalty Tables Structure
-- This script ensures all required columns exist in the royalty tables

-- 1. Fix royalty_agreement_version_shares table
-- Add earner_wallet column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'royalty_agreement_version_shares' 
    AND column_name = 'earner_wallet'
  ) THEN
    ALTER TABLE royalty_agreement_version_shares 
    ADD COLUMN earner_wallet TEXT;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'royalty_agreement_version_shares_agreement_version_id_earner_wallet_key'
    ) THEN
      ALTER TABLE royalty_agreement_version_shares 
      ADD CONSTRAINT royalty_agreement_version_shares_agreement_version_id_earner_wallet_key 
      UNIQUE (agreement_version_id, earner_wallet);
    END IF;
    
    -- Add index if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_ravs_wallet'
    ) THEN
      CREATE INDEX idx_ravs_wallet ON royalty_agreement_version_shares(earner_wallet);
    END IF;
  END IF;
END $$;

-- 2. Fix royalty_agreement_versions table
-- Add platform_fee_bps column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'royalty_agreement_versions' 
    AND column_name = 'platform_fee_bps'
  ) THEN
    ALTER TABLE royalty_agreement_versions 
    ADD COLUMN platform_fee_bps INTEGER NOT NULL DEFAULT 1000;
    
    -- Add check constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'royalty_agreement_versions_platform_fee_bps_check'
    ) THEN
      ALTER TABLE royalty_agreement_versions 
      ADD CONSTRAINT royalty_agreement_versions_platform_fee_bps_check 
      CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 10000);
    END IF;
  END IF;
END $$;

-- 3. Fix fee_accrual_ledger table
-- Add agreement_version_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_accrual_ledger' 
    AND column_name = 'agreement_version_id'
  ) THEN
    ALTER TABLE fee_accrual_ledger 
    ADD COLUMN agreement_version_id UUID REFERENCES royalty_agreement_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Create missing tables if they don't exist
-- Create royalty_agreement_versions if it doesn't exist
CREATE TABLE IF NOT EXISTS royalty_agreement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  platform_fee_bps INTEGER NOT NULL DEFAULT 1000 CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 10000),
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create royalty_agreement_version_shares if it doesn't exist
CREATE TABLE IF NOT EXISTS royalty_agreement_version_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_version_id UUID NOT NULL REFERENCES royalty_agreement_versions(id) ON DELETE CASCADE,
  earner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  earner_wallet TEXT NOT NULL,
  bps INTEGER NOT NULL CHECK (bps >= 0 AND bps <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agreement_version_id, earner_wallet)
);

-- Create royalty_changes_history if it doesn't exist
CREATE TABLE IF NOT EXISTS royalty_changes_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  previous_royalty_earners JSONB,
  new_royalty_earners JSONB NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fees_at_change DECIMAL(20,8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fee_accrual_ledger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_entry_type') THEN
    CREATE TYPE ledger_entry_type AS ENUM ('ACCRUAL', 'CLAIM_FROM_BAGS', 'PAYOUT_TO_EARNER', 'PLATFORM_WITHDRAWAL', 'ADJUSTMENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_beneficiary_kind') THEN
    CREATE TYPE ledger_beneficiary_kind AS ENUM ('PLATFORM', 'EARNER', 'TREASURY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS fee_accrual_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  entry_type ledger_entry_type NOT NULL,
  beneficiary_kind ledger_beneficiary_kind NOT NULL,
  beneficiary_wallet TEXT,
  amount_lamports BIGINT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  related_snapshot_id UUID,
  agreement_version_id UUID REFERENCES royalty_agreement_versions(id) ON DELETE SET NULL,
  related_bags_claim_id UUID,
  related_payout_id UUID,
  external_tx_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_royalty_agreement_versions_token_id ON royalty_agreement_versions(token_id);
CREATE INDEX IF NOT EXISTS idx_royalty_agreement_versions_effective_from ON royalty_agreement_versions(effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_ravs_agreement ON royalty_agreement_version_shares(agreement_version_id);
CREATE INDEX IF NOT EXISTS idx_ravs_wallet ON royalty_agreement_version_shares(earner_wallet);
CREATE INDEX IF NOT EXISTS idx_royalty_changes_token_id ON royalty_changes_history(token_id);
CREATE INDEX IF NOT EXISTS idx_royalty_changes_changed_at ON royalty_changes_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_token_type_time ON fee_accrual_ledger(token_id, entry_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_wallet_token ON fee_accrual_ledger(beneficiary_wallet, token_id);

-- 6. Enable RLS and create policies
ALTER TABLE royalty_agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_agreement_version_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_changes_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_accrual_ledger ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'royalty_agreement_versions' 
    AND policyname = 'Allow all operations for service role'
  ) THEN
    CREATE POLICY "Allow all operations for service role" ON royalty_agreement_versions FOR ALL USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'royalty_agreement_version_shares' 
    AND policyname = 'Allow all operations for service role'
  ) THEN
    CREATE POLICY "Allow all operations for service role" ON royalty_agreement_version_shares FOR ALL USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'royalty_changes_history' 
    AND policyname = 'Allow all operations for service role'
  ) THEN
    CREATE POLICY "Allow all operations for service role" ON royalty_changes_history FOR ALL USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fee_accrual_ledger' 
    AND policyname = 'Allow all operations for service role'
  ) THEN
    CREATE POLICY "Allow all operations for service role" ON fee_accrual_ledger FOR ALL USING (true);
  END IF;
END $$;

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_agreement_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_agreement_version_shares TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_changes_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_accrual_ledger TO service_role;

-- 8. Add comments
COMMENT ON TABLE royalty_agreement_versions IS 'Versioned royalty schedules per token; non-overlapping time ranges.';
COMMENT ON TABLE royalty_agreement_version_shares IS 'Per-version splits; sum(bps) = 10000 - platform_fee_bps for the parent version.';
COMMENT ON TABLE royalty_changes_history IS 'Tracks historical changes to royalty distributions for tokens';
COMMENT ON TABLE fee_accrual_ledger IS 'Single source of truth for accruals, claims, payouts; append-only.';
