-- Snapshots of Bags lifetime fees per token (monotonic)
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

-- Accrual ledger: immutable, append-only
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
  related_snapshot_id UUID REFERENCES token_fee_snapshots(id) ON DELETE SET NULL,
  agreement_version_id UUID REFERENCES royalty_agreement_versions(id) ON DELETE SET NULL,
  related_bags_claim_id UUID,
  related_payout_id UUID,
  external_tx_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_token_type_time ON fee_accrual_ledger(token_id, entry_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_wallet_token ON fee_accrual_ledger(beneficiary_wallet, token_id);

COMMENT ON TABLE fee_accrual_ledger IS 'Single source of truth for accruals, claims, payouts; append-only.';

-- Bags claims captured on-chain to treasury
CREATE TABLE IF NOT EXISTS bags_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  treasury_wallet TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports >= 0),
  tx_signature TEXT UNIQUE NOT NULL,
  slot BIGINT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','failed')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bags_claims_token_time ON bags_claims(token_id, occurred_at DESC);

COMMENT ON TABLE bags_claims IS 'On-chain claims from Bags to treasury.';

-- Job runs for observability and idempotency
CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error')),
  error TEXT,
  tokens_processed INTEGER DEFAULT 0,
  snapshots_written INTEGER DEFAULT 0,
  claims_processed INTEGER DEFAULT 0,
  view_refresh_ms INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_job_runs_name_time ON job_runs(job_name, started_at DESC);

-- Idempotency helpers
-- Prevent duplicate ACCRUAL per beneficiary per snapshot
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ledger_accrual_by_snapshot_beneficiary
ON fee_accrual_ledger (token_id, related_snapshot_id, beneficiary_kind, COALESCE(beneficiary_wallet, ''))
WHERE entry_type = 'ACCRUAL';

-- Prevent duplicate CLAIM_FROM_BAGS by signature
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ledger_claim_by_signature
ON fee_accrual_ledger (token_id, entry_type, external_tx_signature)
WHERE entry_type = 'CLAIM_FROM_BAGS';

-- Prevent duplicate PAYOUT_TO_EARNER by signature
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ledger_payout_by_signature
ON fee_accrual_ledger (token_id, entry_type, external_tx_signature)
WHERE entry_type = 'PAYOUT_TO_EARNER';

-- Foreign key backfills after related tables exist
ALTER TABLE fee_accrual_ledger
  ADD CONSTRAINT fk_ledger_bags_claim
  FOREIGN KEY (related_bags_claim_id) REFERENCES bags_claims(id) ON DELETE SET NULL;

ALTER TABLE fee_accrual_ledger
  ADD CONSTRAINT fk_ledger_royalty_payout
  FOREIGN KEY (related_payout_id) REFERENCES royalty_payouts(id) ON DELETE SET NULL;


