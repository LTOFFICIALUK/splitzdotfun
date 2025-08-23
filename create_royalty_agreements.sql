-- Enable necessary extensions for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Royalty agreement versions: time-bounded, non-overlapping per token
CREATE TABLE IF NOT EXISTS royalty_agreement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  platform_fee_bps INTEGER NOT NULL DEFAULT 2000 CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 10000),
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

-- Per-version earner shares (bps)
CREATE TABLE IF NOT EXISTS royalty_agreement_version_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_version_id UUID NOT NULL REFERENCES royalty_agreement_versions(id) ON DELETE CASCADE,
  earner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  earner_wallet TEXT NOT NULL, -- canonical wallet string
  bps INTEGER NOT NULL CHECK (bps >= 0 AND bps <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agreement_version_id, earner_wallet)
);

CREATE INDEX IF NOT EXISTS idx_ravs_agreement ON royalty_agreement_version_shares(agreement_version_id);
CREATE INDEX IF NOT EXISTS idx_ravs_wallet ON royalty_agreement_version_shares(earner_wallet);

COMMENT ON TABLE royalty_agreement_version_shares IS 'Per-version splits; sum(bps) = 10000 - platform_fee_bps for the parent version.';

-- Validation: ensure sum(bps) matches (10000 - platform_fee_bps)
CREATE OR REPLACE FUNCTION validate_version_bps_sum(p_version_id UUID)
RETURNS VOID AS $$
DECLARE
  v_platform_bps INTEGER;
  v_sum_shares INTEGER;
BEGIN
  SELECT platform_fee_bps INTO v_platform_bps FROM royalty_agreement_versions WHERE id = p_version_id;
  IF v_platform_bps IS NULL THEN
    RAISE EXCEPTION 'royalty_agreement_versions % not found', p_version_id;
  END IF;

  SELECT COALESCE(SUM(bps), 0) INTO v_sum_shares FROM royalty_agreement_version_shares WHERE agreement_version_id = p_version_id;

  IF v_sum_shares <> (10000 - v_platform_bps) THEN
    RAISE EXCEPTION 'Invalid bps total: % (shares) vs % (required = 10000 - platform %)', v_sum_shares, (10000 - v_platform_bps), v_platform_bps;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- BEFORE row-level check: prevent sum from exceeding pool during incremental changes
CREATE OR REPLACE FUNCTION trg_validate_shares_sum_leq()
RETURNS TRIGGER AS $$
DECLARE
  v_platform_bps INTEGER;
  v_sum_existing INTEGER;
  v_required INTEGER;
  v_version_id UUID;
  v_new_bps INTEGER;
BEGIN
  v_version_id := COALESCE(NEW.agreement_version_id, OLD.agreement_version_id);
  SELECT platform_fee_bps INTO v_platform_bps FROM royalty_agreement_versions WHERE id = v_version_id;
  IF v_platform_bps IS NULL THEN
    RAISE EXCEPTION 'royalty_agreement_versions % not found', v_version_id;
  END IF;
  v_required := 10000 - v_platform_bps;

  -- Sum current shares excluding the row being updated (if UPDATE)
  SELECT COALESCE(SUM(bps), 0) INTO v_sum_existing
  FROM royalty_agreement_version_shares
  WHERE agreement_version_id = v_version_id
    AND (TG_OP <> 'UPDATE' OR earner_wallet <> OLD.earner_wallet);

  v_new_bps := CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE NEW.bps END;

  IF (v_sum_existing + v_new_bps) > v_required THEN
    RAISE EXCEPTION 'Shares exceed allowed pool for version %: trying total %, required %', v_version_id, (v_sum_existing + v_new_bps), v_required;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Constraint trigger: enforce equality at end of transaction
CREATE OR REPLACE FUNCTION trg_validate_shares_sum_eq_stmt()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
  v_required INTEGER;
BEGIN
  FOR rec IN (
    SELECT v.id AS version_id, v.platform_fee_bps, COALESCE(SUM(s.bps),0) AS sum_bps
    FROM royalty_agreement_versions v
    LEFT JOIN royalty_agreement_version_shares s ON s.agreement_version_id = v.id
    GROUP BY v.id, v.platform_fee_bps
  ) LOOP
    v_required := 10000 - rec.platform_fee_bps;
    IF rec.sum_bps <> v_required THEN
      RAISE EXCEPTION 'Invalid bps total for version %: % (shares) vs % (required = 10000 - platform %)', rec.version_id, rec.sum_bps, v_required, rec.platform_fee_bps;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'validate_shares_sum_aiud'
  ) THEN
    -- Row-level guard (sum <= pool)
    DROP TRIGGER IF EXISTS validate_shares_sum_leq_biu ON royalty_agreement_version_shares;
    CREATE TRIGGER validate_shares_sum_leq_biu
      BEFORE INSERT OR UPDATE ON royalty_agreement_version_shares
      FOR EACH ROW EXECUTE FUNCTION trg_validate_shares_sum_leq();

    -- Statement-level equality check (fires after each statement)
    DROP TRIGGER IF EXISTS validate_shares_sum_eq_stmt ON royalty_agreement_version_shares;
    CREATE TRIGGER validate_shares_sum_eq_stmt
      AFTER INSERT OR UPDATE OR DELETE ON royalty_agreement_version_shares
      FOR EACH STATEMENT EXECUTE FUNCTION trg_validate_shares_sum_eq_stmt();
  END IF;
END $$;

-- Trigger to re-validate when platform_fee_bps changes on versions
CREATE OR REPLACE FUNCTION trg_validate_version_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.platform_fee_bps IS DISTINCT FROM OLD.platform_fee_bps) THEN
    PERFORM validate_version_bps_sum(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'validate_version_on_update_bps'
  ) THEN
    CREATE TRIGGER validate_version_on_update_bps
      AFTER UPDATE ON royalty_agreement_versions
      FOR EACH ROW EXECUTE FUNCTION trg_validate_version_on_update();
  END IF;
END $$;


