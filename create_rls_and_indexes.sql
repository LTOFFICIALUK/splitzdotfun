-- Enable RLS selectively; service role will bypass

-- RLS on fee tables for read-only public access can be restricted later.
DO $$ BEGIN
  IF to_regclass('public.royalty_agreement_versions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE royalty_agreement_versions ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.royalty_agreement_version_shares') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE royalty_agreement_version_shares ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.token_fee_snapshots') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE token_fee_snapshots ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.fee_accrual_ledger') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE fee_accrual_ledger ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.bags_claims') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE bags_claims ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.job_runs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Minimal permissive read policies; refine as needed in app
DO $$
BEGIN
  IF to_regclass('public.token_fee_snapshots') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'token_fee_snapshots' AND policyname = 'Public read snapshots'
  ) THEN
    CREATE POLICY "Public read snapshots" ON token_fee_snapshots FOR SELECT USING (true);
  END IF;

  IF to_regclass('public.fee_accrual_ledger') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fee_accrual_ledger' AND policyname = 'Public read ledger'
  ) THEN
    CREATE POLICY "Public read ledger" ON fee_accrual_ledger FOR SELECT USING (true);
  END IF;

  IF to_regclass('public.royalty_agreement_versions') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'royalty_agreement_versions' AND policyname = 'Public read agreements'
  ) THEN
    CREATE POLICY "Public read agreements" ON royalty_agreement_versions FOR SELECT USING (true);
  END IF;

  IF to_regclass('public.royalty_agreement_version_shares') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'royalty_agreement_version_shares' AND policyname = 'Public read shares'
  ) THEN
    CREATE POLICY "Public read shares" ON royalty_agreement_version_shares FOR SELECT USING (true);
  END IF;

  IF to_regclass('public.bags_claims') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bags_claims' AND policyname = 'Public read claims'
  ) THEN
    CREATE POLICY "Public read claims" ON bags_claims FOR SELECT USING (true);
  END IF;
END $$;


