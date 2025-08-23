-- Monotonicity: ensure snapshots never go backwards per token
CREATE OR REPLACE FUNCTION enforce_monotonic_snapshots()
RETURNS TRIGGER AS $$
DECLARE
  v_prev BIGINT;
BEGIN
  SELECT lifetime_fees_lamports_after
  INTO v_prev
  FROM token_fee_snapshots
  WHERE token_id = NEW.token_id
  ORDER BY lifetime_fees_lamports_after DESC
  LIMIT 1;

  IF v_prev IS NOT NULL AND NEW.lifetime_fees_lamports_after < v_prev THEN
    RAISE EXCEPTION 'Snapshot not monotonic for token %: new % < prev %', NEW.token_id, NEW.lifetime_fees_lamports_after, v_prev;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.token_fee_snapshots') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_monotonic_snapshots_insert'
    ) THEN
      CREATE TRIGGER enforce_monotonic_snapshots_insert
        BEFORE INSERT ON token_fee_snapshots
        FOR EACH ROW EXECUTE FUNCTION enforce_monotonic_snapshots();
    END IF;
  END IF;
END $$;

-- Safety checks for payouts and treasury balances can be enforced in app layer.
-- Here we provide helper views to compute balances and allow CHECKs via triggers if needed.

-- Optional: prevent negative owed or treasury via trigger validations
CREATE OR REPLACE FUNCTION validate_non_negative_balances()
RETURNS TRIGGER AS $$
DECLARE
  v_earner_owed BIGINT;
  v_treasury BIGINT;
BEGIN
  -- Only check on payouts and platform withdrawals
  IF NEW.entry_type = 'PAYOUT_TO_EARNER' THEN
    SELECT owed_total_lamports INTO v_earner_owed
    FROM earner_token_balances_v
    WHERE token_id = NEW.token_id AND earner_wallet = COALESCE(NEW.beneficiary_wallet, '');
    IF v_earner_owed IS NULL THEN v_earner_owed := 0; END IF;
    IF NEW.amount_lamports > GREATEST(0, v_earner_owed) THEN
      RAISE EXCEPTION 'Payout exceeds owed for % on token %: trying %, owed %', NEW.beneficiary_wallet, NEW.token_id, NEW.amount_lamports, v_earner_owed;
    END IF;
  END IF;

  IF NEW.entry_type IN ('PAYOUT_TO_EARNER','PLATFORM_WITHDRAWAL') THEN
    SELECT treasury_liquid_balance_lamports INTO v_treasury FROM token_balances_v WHERE token_id = NEW.token_id;
    IF v_treasury IS NULL THEN v_treasury := 0; END IF;
    IF NEW.amount_lamports > GREATEST(0, v_treasury) THEN
      RAISE EXCEPTION 'Entry would overdraw treasury for token %: trying %, treasury %', NEW.token_id, NEW.amount_lamports, v_treasury;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.fee_accrual_ledger') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'validate_balances_before_insert'
    ) THEN
      CREATE TRIGGER validate_balances_before_insert
        BEFORE INSERT ON fee_accrual_ledger
        FOR EACH ROW EXECUTE FUNCTION validate_non_negative_balances();
    END IF;
  END IF;
END $$;

-- View: per earner balances
CREATE OR REPLACE VIEW earner_token_balances_v AS
SELECT
  l.token_id,
  COALESCE(l.beneficiary_wallet, '') AS earner_wallet,
  SUM(CASE WHEN l.entry_type = 'ACCRUAL' AND l.beneficiary_kind = 'EARNER' THEN l.amount_lamports ELSE 0 END) AS earned_total_lamports,
  SUM(CASE WHEN l.entry_type = 'PAYOUT_TO_EARNER' THEN l.amount_lamports ELSE 0 END) AS paid_total_lamports,
  SUM(CASE WHEN l.entry_type = 'ACCRUAL' AND l.beneficiary_kind = 'EARNER' THEN l.amount_lamports ELSE 0 END) -
  SUM(CASE WHEN l.entry_type = 'PAYOUT_TO_EARNER' THEN l.amount_lamports ELSE 0 END) AS owed_total_lamports
FROM fee_accrual_ledger l
GROUP BY l.token_id, COALESCE(l.beneficiary_wallet, '');

-- View: token treasury balances and reconciliation
CREATE OR REPLACE VIEW token_balances_v AS
WITH lifetime AS (
  SELECT token_id, MAX(lifetime_fees_lamports_after) AS lifetime_total_lamports
  FROM token_fee_snapshots
  GROUP BY token_id
),
agg AS (
  SELECT
    token_id,
    SUM(CASE WHEN entry_type = 'ACCRUAL' AND beneficiary_kind = 'PLATFORM' THEN amount_lamports ELSE 0 END) AS platform_earned_lamports,
    SUM(CASE WHEN entry_type = 'ACCRUAL' AND beneficiary_kind = 'EARNER' THEN amount_lamports ELSE 0 END) AS earners_earned_lamports,
    SUM(CASE WHEN entry_type = 'CLAIM_FROM_BAGS' THEN amount_lamports ELSE 0 END) AS claimed_from_bags_lamports,
    SUM(CASE WHEN entry_type = 'PAYOUT_TO_EARNER' THEN amount_lamports ELSE 0 END) AS distributed_to_earners_lamports,
    SUM(CASE WHEN entry_type = 'PLATFORM_WITHDRAWAL' THEN amount_lamports ELSE 0 END) AS platform_withdrawals_lamports
  FROM fee_accrual_ledger
  GROUP BY token_id
)
SELECT
  COALESCE(lifetime.token_id, agg.token_id) AS token_id,
  lifetime.lifetime_total_lamports,
  agg.platform_earned_lamports,
  agg.earners_earned_lamports,
  agg.claimed_from_bags_lamports,
  agg.distributed_to_earners_lamports,
  agg.platform_withdrawals_lamports,
  (COALESCE(agg.claimed_from_bags_lamports,0) - COALESCE(agg.distributed_to_earners_lamports,0) - COALESCE(agg.platform_withdrawals_lamports,0)) AS treasury_liquid_balance_lamports
FROM lifetime
FULL OUTER JOIN agg ON agg.token_id = lifetime.token_id;


