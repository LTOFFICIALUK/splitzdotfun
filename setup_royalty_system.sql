-- Setup Royalty System Tables
-- This script ensures all necessary tables exist for the royalty system

-- Enable necessary extensions for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Royalty agreement versions: time-bounded, non-overlapping per token
CREATE TABLE IF NOT EXISTS royalty_agreement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  platform_fee_bps INTEGER NOT NULL DEFAULT 1000 CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 10000),
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Stored generated range for exclusion constraint (timestamptz range)
  valid_during tstzrange GENERATED ALWAYS AS (tstzrange(effective_from, effective_to)) STORED
);

-- Prevent overlapping versions per token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'royalty_agreement_versions_no_overlap'
  ) THEN
    CREATE INDEX royalty_agreement_versions_no_overlap ON royalty_agreement_versions USING GIST (token_id, valid_during);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'royalty_agreement_versions_excl'
  ) THEN
    ALTER TABLE royalty_agreement_versions
      ADD CONSTRAINT royalty_agreement_versions_excl
      EXCLUDE USING GIST (
        token_id WITH =,
        valid_during WITH &&
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_royalty_agreement_versions_token_id ON royalty_agreement_versions(token_id);
CREATE INDEX IF NOT EXISTS idx_royalty_agreement_versions_effective_from ON royalty_agreement_versions(effective_from DESC);

COMMENT ON TABLE royalty_agreement_versions IS 'Versioned royalty schedules per token; non-overlapping time ranges.';

-- 2. Per-version earner shares (bps)
CREATE TABLE IF NOT EXISTS royalty_agreement_version_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_version_id UUID NOT NULL REFERENCES royalty_agreement_versions(id) ON DELETE CASCADE,
  earner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  earner_wallet TEXT NOT NULL, -- canonical wallet string or social handle
  bps INTEGER NOT NULL CHECK (bps >= 0 AND bps <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agreement_version_id, earner_wallet)
);

CREATE INDEX IF NOT EXISTS idx_ravs_agreement ON royalty_agreement_version_shares(agreement_version_id);
CREATE INDEX IF NOT EXISTS idx_ravs_wallet ON royalty_agreement_version_shares(earner_wallet);

COMMENT ON TABLE royalty_agreement_version_shares IS 'Per-version splits; sum(bps) = 10000 - platform_fee_bps for the parent version.';

-- 3. Royalty changes history
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

CREATE INDEX IF NOT EXISTS idx_royalty_changes_token_id ON royalty_changes_history(token_id);
CREATE INDEX IF NOT EXISTS idx_royalty_changes_changed_at ON royalty_changes_history(changed_at);

COMMENT ON TABLE royalty_changes_history IS 'Tracks historical changes to royalty distributions for tokens';

-- 4. Fee accrual ledger
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

CREATE INDEX IF NOT EXISTS idx_fee_ledger_token_type_time ON fee_accrual_ledger(token_id, entry_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_wallet_token ON fee_accrual_ledger(beneficiary_wallet, token_id);

COMMENT ON TABLE fee_accrual_ledger IS 'Single source of truth for accruals, claims, payouts; append-only.';

-- 5. Token fee snapshots
CREATE TABLE IF NOT EXISTS token_fee_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  lifetime_fees_lamports_after BIGINT NOT NULL CHECK (lifetime_fees_lamports_after >= 0),
  bags_block_time TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  job_run_id UUID,
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token_id, lifetime_fees_lamports_after)
);

CREATE INDEX IF NOT EXISTS idx_token_fee_snapshots_token_time ON token_fee_snapshots(token_id, fetched_at DESC);

COMMENT ON TABLE token_fee_snapshots IS 'Monotonic snapshots from Bags lifetime fees API; deltas drive accrual ledger.';

-- 6. Royalty payouts
CREATE TABLE IF NOT EXISTS royalty_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  earner_wallet TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports > 0),
  amount_sol DECIMAL(20,8) GENERATED ALWAYS AS (amount_lamports / 1000000000.0) STORED,
  transaction_signature TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_royalty_payouts_token_id ON royalty_payouts(token_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_earner_wallet ON royalty_payouts(earner_wallet);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_status ON royalty_payouts(status);

COMMENT ON TABLE royalty_payouts IS 'Tracks royalty payouts to earners';

-- 7. Royalty leaderboard
CREATE TABLE IF NOT EXISTS royalty_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earner_wallet TEXT NOT NULL,
  total_earned_lamports BIGINT DEFAULT 0,
  total_earned_sol DECIMAL(20,8) GENERATED ALWAYS AS (total_earned_lamports / 1000000000.0) STORED,
  total_paid_out_lamports BIGINT DEFAULT 0,
  total_paid_out_sol DECIMAL(20,8) GENERATED ALWAYS AS (total_paid_out_lamports / 1000000000.0) STORED,
  pending_balance_lamports BIGINT DEFAULT 0,
  pending_balance_sol DECIMAL(20,8) GENERATED ALWAYS AS (pending_balance_lamports / 1000000000.0) STORED,
  tokens_count INTEGER DEFAULT 0,
  last_payout_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (earner_wallet)
);

CREATE INDEX IF NOT EXISTS idx_royalty_leaderboard_earned ON royalty_leaderboard(total_earned_lamports DESC);
CREATE INDEX IF NOT EXISTS idx_royalty_leaderboard_pending ON royalty_leaderboard(pending_balance_lamports DESC);

COMMENT ON TABLE royalty_leaderboard IS 'Aggregated royalty earnings leaderboard';

-- 8. Stats cache
CREATE TABLE IF NOT EXISTS stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stats_cache_key ON stats_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_stats_cache_expires_at ON stats_cache(expires_at);

COMMENT ON TABLE stats_cache IS 'Cached statistics for performance';

-- Enable Row Level Security
ALTER TABLE royalty_agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_agreement_version_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_changes_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_accrual_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_fee_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for service role)
CREATE POLICY "Allow all operations for service role" ON royalty_agreement_versions FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role" ON royalty_agreement_version_shares FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role" ON royalty_changes_history FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role" ON fee_accrual_ledger FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role" ON token_fee_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role" ON royalty_payouts FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role" ON royalty_leaderboard FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role" ON stats_cache FOR ALL USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_agreement_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_agreement_version_shares TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_changes_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_accrual_ledger TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON token_fee_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_payouts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON royalty_leaderboard TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON stats_cache TO service_role;

-- Create views for easier querying
CREATE OR REPLACE VIEW earner_token_balances_v AS
SELECT 
  f.token_id,
  f.beneficiary_wallet,
  t.name as token_name,
  t.symbol as token_symbol,
  SUM(CASE WHEN f.entry_type = 'ACCRUAL' THEN f.amount_lamports ELSE 0 END) as total_accrued_lamports,
  SUM(CASE WHEN f.entry_type = 'PAYOUT_TO_EARNER' THEN f.amount_lamports ELSE 0 END) as total_paid_out_lamports,
  (SUM(CASE WHEN f.entry_type = 'ACCRUAL' THEN f.amount_lamports ELSE 0 END) - 
   SUM(CASE WHEN f.entry_type = 'PAYOUT_TO_EARNER' THEN f.amount_lamports ELSE 0 END)) as pending_balance_lamports
FROM fee_accrual_ledger f
JOIN tokens t ON f.token_id = t.id
WHERE f.beneficiary_kind = 'EARNER' AND f.beneficiary_wallet IS NOT NULL
GROUP BY f.token_id, f.beneficiary_wallet, t.name, t.symbol;

CREATE OR REPLACE VIEW token_balances_v AS
SELECT 
  f.token_id,
  t.name as token_name,
  t.symbol as token_symbol,
  SUM(CASE WHEN f.entry_type = 'ACCRUAL' THEN f.amount_lamports ELSE 0 END) as total_accrued_lamports,
  SUM(CASE WHEN f.entry_type = 'CLAIM_FROM_BAGS' THEN f.amount_lamports ELSE 0 END) as total_claimed_from_bags_lamports,
  SUM(CASE WHEN f.entry_type = 'PAYOUT_TO_EARNER' THEN f.amount_lamports ELSE 0 END) as total_paid_out_lamports,
  SUM(CASE WHEN f.entry_type = 'PLATFORM_WITHDRAWAL' THEN f.amount_lamports ELSE 0 END) as total_platform_withdrawals_lamports
FROM fee_accrual_ledger f
JOIN tokens t ON f.token_id = t.id
GROUP BY f.token_id, t.name, t.symbol;

GRANT SELECT ON earner_token_balances_v TO service_role;
GRANT SELECT ON token_balances_v TO service_role;

COMMENT ON VIEW earner_token_balances_v IS 'View of earner balances per token';
COMMENT ON VIEW token_balances_v IS 'View of token treasury balances';
