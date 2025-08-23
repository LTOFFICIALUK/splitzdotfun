-- Prevent UPDATE/DELETE on append-only tables

CREATE OR REPLACE FUNCTION deny_update_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'This table is append-only; % not allowed on %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.token_fee_snapshots') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'aonly_snapshots_ud') THEN
      CREATE TRIGGER aonly_snapshots_ud BEFORE UPDATE OR DELETE ON token_fee_snapshots
      FOR EACH ROW EXECUTE FUNCTION deny_update_delete();
    END IF;
  END IF;
  IF to_regclass('public.fee_accrual_ledger') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'aonly_ledger_ud') THEN
      CREATE TRIGGER aonly_ledger_ud BEFORE UPDATE OR DELETE ON fee_accrual_ledger
      FOR EACH ROW EXECUTE FUNCTION deny_update_delete();
    END IF;
  END IF;
END $$;

-- Additional data quality checks on fee_accrual_ledger
ALTER TABLE fee_accrual_ledger
  ADD CONSTRAINT chk_amount_non_negative_for_non_adjustment
  CHECK (entry_type = 'ADJUSTMENT' OR amount_lamports >= 0);

ALTER TABLE fee_accrual_ledger
  ADD CONSTRAINT chk_earner_wallet_present
  CHECK ( (beneficiary_kind <> 'EARNER') OR (beneficiary_wallet IS NOT NULL AND length(beneficiary_wallet) > 0) );


