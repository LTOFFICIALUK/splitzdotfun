-- Fix existing royalty share records for CRM token
-- This script adds the missing royalty share records

-- First, let's check what we have
SELECT 
  rav.id as agreement_version_id,
  rav.token_id,
  rav.platform_fee_bps,
  COUNT(ravs.id) as current_share_count,
  ravs.earner_wallet,
  ravs.bps
FROM royalty_agreement_versions rav
LEFT JOIN royalty_agreement_version_shares ravs ON rav.id = ravs.agreement_version_id
WHERE rav.token_id = 'b571a0af-e537-4310-a601-c1b726ef3780' -- CRM token
GROUP BY rav.id, rav.token_id, rav.platform_fee_bps, ravs.earner_wallet, ravs.bps;

-- Insert missing royalty share records
INSERT INTO royalty_agreement_version_shares (
  agreement_version_id,
  earner_wallet,
  bps
) VALUES 
  ('29473dd8-6326-4bbb-961d-6b145d99573e', 'community_wallet_address', 2250),
  ('29473dd8-6326-4bbb-961d-6b145d99573e', 'X:@crypto_influencer', 1350)
ON CONFLICT (agreement_version_id, earner_wallet) DO NOTHING;

-- Fix the BPS for the existing record (should be 6000, not 5400)
UPDATE royalty_agreement_version_shares 
SET bps = 6000 
WHERE agreement_version_id = '29473dd8-6326-4bbb-961d-6b145d99573e' 
  AND earner_wallet = 'sample_wallet_address'
  AND bps = 5400;

-- Verify the fix
SELECT 
  rav.id as agreement_version_id,
  rav.token_id,
  rav.platform_fee_bps,
  COUNT(ravs.id) as total_share_count,
  SUM(ravs.bps) as total_bps,
  (10000 - rav.platform_fee_bps) as expected_bps,
  CASE 
    WHEN SUM(ravs.bps) = (10000 - rav.platform_fee_bps) THEN '✅ VALID'
    ELSE '❌ INVALID'
  END as validation
FROM royalty_agreement_versions rav
LEFT JOIN royalty_agreement_version_shares ravs ON rav.id = ravs.agreement_version_id
WHERE rav.token_id = 'b571a0af-e537-4310-a601-c1b726ef3780' -- CRM token
GROUP BY rav.id, rav.token_id, rav.platform_fee_bps;

-- Show all royalty shares for the token
SELECT 
  ravs.earner_wallet,
  ravs.bps,
  (ravs.bps / 100.0) as percentage,
  CASE 
    WHEN ravs.earner_wallet = 'sample_wallet_address' THEN 'Management'
    WHEN ravs.earner_wallet = 'community_wallet_address' THEN 'Community'
    WHEN ravs.earner_wallet = 'X:@crypto_influencer' THEN 'Influencer'
    ELSE 'Unknown'
  END as role
FROM royalty_agreement_version_shares ravs
JOIN royalty_agreement_versions rav ON ravs.agreement_version_id = rav.id
WHERE rav.token_id = 'b571a0af-e537-4310-a601-c1b726ef3780' -- CRM token
ORDER BY ravs.bps DESC;
