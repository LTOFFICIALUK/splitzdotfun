-- Backfill initial royalty agreements from token_ownership.royalty_earners JSON
-- Assumptions:
--  - Platform fee = 2000 bps (20%) unless overridden later
--  - token_ownership.royalty_earners is an array of { social_or_wallet, role, percentage (0-100) }
--  - Earner percentages in existing JSON may not sum to 100; we treat them as weights
--    and normalize across the earner pool (80%) so all earner bps sum to 8000 exactly.

-- Helper function to validate JSON data
CREATE OR REPLACE FUNCTION is_valid_json_array(json_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's a valid JSON array
  IF json_text IS NULL OR length(trim(json_text)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if it looks like a JSON array
  IF NOT (json_text ~ '^\[.*\]$') THEN
    RETURN FALSE;
  END IF;
  
  -- Try to parse as JSONB
  BEGIN
    PERFORM json_text::jsonb;
    RETURN jsonb_typeof(json_text::jsonb) = 'array';
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION backfill_initial_royalty_versions()
RETURNS VOID AS $$
DECLARE
  v_token_id UUID;
  v_created_at TIMESTAMPTZ;
  v_royalty_earners_raw TEXT;
  v_version_id UUID;
  v_platform_bps INTEGER := 2000;
  v_total_pool_bps INTEGER := 10000 - v_platform_bps; -- 8000
  v_sum_pct NUMERIC;
  v_accum_bps INTEGER;
  v_idx INTEGER;
  v_len INTEGER;
  v_item JSONB;
  v_wallet TEXT;
  v_pct NUMERIC;
  v_bps INTEGER;
  v_royalty_earners_json JSONB;
  v_earner_count INTEGER;
  v_token_ids UUID[];
  v_token_count INTEGER;
  v_i INTEGER;
  v_earner_record RECORD;
BEGIN
  -- Skip if agreements table not present yet (defensive)
  IF to_regclass('public.royalty_agreement_versions') IS NULL THEN
    RETURN;
  END IF;
  
  -- Get all token IDs that need processing (no JSON operations here)
  SELECT ARRAY_AGG(t.id) INTO v_token_ids
  FROM tokens t
  JOIN token_ownership o ON o.token_id = t.id
  WHERE o.royalty_earners IS NOT NULL
    AND is_valid_json_array(o.royalty_earners::text)  -- Use helper function
    AND NOT EXISTS (
      SELECT 1 FROM royalty_agreement_versions v WHERE v.token_id = t.id
    );
  
  -- If no tokens to process, exit
  IF v_token_ids IS NULL OR array_length(v_token_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  
  v_token_count := array_length(v_token_ids, 1);
  
  -- Process each token individually
  FOR v_i IN 1..v_token_count LOOP
    v_token_id := v_token_ids[v_i];
    
    -- Get basic token info
    SELECT created_at INTO v_created_at FROM tokens WHERE id = v_token_id;
    
    -- Try to get royalty_earners as text - skip if it fails
    BEGIN
      SELECT royalty_earners::text INTO v_royalty_earners_raw
      FROM token_ownership 
      WHERE token_id = v_token_id;
    EXCEPTION WHEN others THEN
      -- Skip this token if we can't get the data
      CONTINUE;
    END;
    
    -- Skip if it's not a string or is empty
    IF v_royalty_earners_raw IS NULL OR length(trim(v_royalty_earners_raw)) = 0 THEN
      CONTINUE;
    END IF;
    
    -- Skip if it doesn't look like a JSON array
    IF NOT (v_royalty_earners_raw ~ '^\[.*\]$') THEN
      CONTINUE;
    END IF;
    
    -- Safely parse JSON with error handling
    BEGIN
      v_royalty_earners_json := v_royalty_earners_raw::jsonb;
    EXCEPTION WHEN others THEN
      -- Skip this record if JSON is malformed
      CONTINUE;
    END;
    
    -- Validate JSON and ensure it is an array before parsing
    IF jsonb_typeof(v_royalty_earners_json) <> 'array' THEN
      CONTINUE;
    END IF;
    
    -- Create version starting from token creation
    INSERT INTO royalty_agreement_versions (token_id, platform_fee_bps, effective_from)
    VALUES (v_token_id, v_platform_bps, COALESCE(v_created_at, now()))
    RETURNING id INTO v_version_id;

    v_sum_pct := 0;
    v_accum_bps := 0;
    v_len := COALESCE(jsonb_array_length(v_royalty_earners_json), 0);
    v_idx := 0;

    -- Build a temp table of earners for this token to avoid triggering validation per row
    CREATE TEMP TABLE IF NOT EXISTS tmp_earners (wallet TEXT, pct NUMERIC) ON COMMIT DROP;
    TRUNCATE tmp_earners;

    WHILE v_idx < v_len LOOP
      BEGIN
        v_item := v_royalty_earners_json -> v_idx;
        v_wallet := (v_item ->> 'social_or_wallet');
        IF (v_item ->> 'percentage') ~ '^[0-9]+(\.[0-9]+)?$' THEN
          v_pct := (v_item ->> 'percentage')::NUMERIC;
        ELSE
          v_pct := NULL;
        END IF;
        IF v_wallet IS NULL OR v_pct IS NULL THEN
          v_idx := v_idx + 1;
          CONTINUE;
        END IF;
        v_sum_pct := v_sum_pct + v_pct;
        INSERT INTO tmp_earners(wallet, pct) VALUES (v_wallet, v_pct);
      EXCEPTION WHEN others THEN
        -- Skip this item if there's an error parsing it
        NULL;
      END;
      v_idx := v_idx + 1;
    END LOOP;

    -- Normalize to earner pool (v_total_pool_bps) proportionally and correct rounding on the last row
    IF v_sum_pct <= 0 THEN
      -- No valid earners; set platform to 100%
      UPDATE royalty_agreement_versions SET platform_fee_bps = 10000 WHERE id = v_version_id;
    ELSE
      -- Get deduplicated earners with their total percentages
      CREATE TEMP TABLE IF NOT EXISTS tmp_dedup_earners (wallet TEXT, pct NUMERIC, bps INTEGER DEFAULT 0) ON COMMIT DROP;
      TRUNCATE tmp_dedup_earners;
      
      INSERT INTO tmp_dedup_earners (wallet, pct)
      SELECT wallet, SUM(pct) AS pct 
      FROM tmp_earners 
      GROUP BY wallet 
      ORDER BY wallet;
      
      -- Calculate bps for each earner, ensuring total equals v_total_pool_bps
      v_accum_bps := 0;
      v_earner_count := (SELECT COUNT(*) FROM tmp_dedup_earners);
      
      -- Handle edge case: if only one earner, give them the full pool
      IF v_earner_count = 1 THEN
        UPDATE tmp_dedup_earners SET bps = v_total_pool_bps;
      ELSE
        -- Calculate bps for all earners except the last one
        UPDATE tmp_dedup_earners 
        SET bps = CASE 
          WHEN wallet = (SELECT wallet FROM tmp_dedup_earners ORDER BY wallet LIMIT 1 OFFSET v_earner_count - 1) THEN
            -- This is the last earner, we'll calculate it after the loop
            0
          ELSE
            FLOOR(v_total_pool_bps * pct / NULLIF(v_sum_pct, 0))
        END;
        
        -- Calculate accumulated bps
        SELECT COALESCE(SUM(bps), 0) INTO v_accum_bps FROM tmp_dedup_earners;
        
        -- Set the last earner to get the remainder
        UPDATE tmp_dedup_earners 
        SET bps = v_total_pool_bps - v_accum_bps
        WHERE wallet = (SELECT wallet FROM tmp_dedup_earners ORDER BY wallet LIMIT 1 OFFSET v_earner_count - 1);
      END IF;
      
      -- Double-check that total equals v_total_pool_bps
      SELECT COALESCE(SUM(bps), 0) INTO v_accum_bps FROM tmp_dedup_earners;
      IF v_accum_bps != v_total_pool_bps THEN
        -- Adjust the last earner to make up the difference
        UPDATE tmp_dedup_earners 
        SET bps = bps + (v_total_pool_bps - v_accum_bps)
        WHERE wallet = (SELECT wallet FROM tmp_dedup_earners ORDER BY wallet LIMIT 1 OFFSET v_earner_count - 1);
      END IF;
      
      -- Insert all earners with valid wallets and positive bps
      INSERT INTO royalty_agreement_version_shares (agreement_version_id, earner_wallet, bps)
      SELECT v_version_id, wallet, bps
      FROM tmp_dedup_earners
      WHERE wallet IS NOT NULL 
        AND length(trim(wallet)) > 0 
        AND bps > 0;
      
      -- If no valid shares were inserted, set platform to 100%
      IF NOT EXISTS (SELECT 1 FROM royalty_agreement_version_shares WHERE agreement_version_id = v_version_id) THEN
        UPDATE royalty_agreement_versions SET platform_fee_bps = 10000 WHERE id = v_version_id;
      ELSE
        -- Validate sum equals pool
        BEGIN
          PERFORM validate_version_bps_sum(v_version_id);
        EXCEPTION WHEN others THEN
          -- If validation still fails, adjust the platform fee to compensate
          UPDATE royalty_agreement_versions 
          SET platform_fee_bps = platform_fee_bps + (v_total_pool_bps - COALESCE((
            SELECT SUM(bps) FROM royalty_agreement_version_shares WHERE agreement_version_id = v_version_id
          ), 0))
          WHERE id = v_version_id;
        END;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute once (safe to rerun: it skips tokens that already have a version)
SELECT backfill_initial_royalty_versions();


