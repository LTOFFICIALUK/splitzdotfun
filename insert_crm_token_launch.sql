-- Insert Crypto Rug Muncher (CRM) Token Launch Data
-- This script populates all tables with token launch information

-- First, let's create a sample user profile if it doesn't exist
-- Replace 'sample_wallet_address' with an actual wallet address
INSERT INTO profiles (wallet_address, username, bio, profile_image_url, social_links, oauth_verifications)
VALUES (
  'sample_wallet_address',
  'crypto_creator',
  'Creator of Crypto Rug Muncher - Building tools to help degens stay safe',
  'https://example.com/profile.jpg',
  '[]'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (wallet_address) DO NOTHING;

-- Get the user profile ID
DO $$
DECLARE
  user_profile_id UUID;
  token_id UUID;
  ownership_id UUID;
  agreement_version_id UUID;
BEGIN
  -- Get the user profile ID
  SELECT id INTO user_profile_id FROM profiles WHERE wallet_address = 'sample_wallet_address';
  
  -- If no profile exists, create one
  IF user_profile_id IS NULL THEN
    INSERT INTO profiles (wallet_address, username, bio, profile_image_url, social_links, oauth_verifications)
    VALUES (
      'sample_wallet_address',
      'crypto_creator',
      'Creator of Crypto Rug Muncher - Building tools to help degens stay safe',
      'https://example.com/profile.jpg',
      '[]'::jsonb,
      '{}'::jsonb
    ) RETURNING id INTO user_profile_id;
  END IF;

  -- 1. Insert token record
  INSERT INTO tokens (
    deployer_user_id,
    deployer_social_or_wallet,
    name,
    symbol,
    description,
    contract_address,
    token_link,
    social_link,
    image_url,
    banner_url,
    metadata_url,
    fees_generated
  ) VALUES (
    user_profile_id,
    'sample_wallet_address',
    'Crypto Rug Muncher',
    'CRM',
    'A community-driven creator token focused on building tools that help degens stay safe while navigating crypto. Transparent, fair, and fully committed to supporting the ecosystem without any shady practices.',
    'Eme5T2s2HB7B8W4YgLG1eReQpnadEVUnQBRjaKTdBAGS',
    'https://splitz.fun/token/Eme5T2s2HB7B8W4YgLG1eReQpnadEVUnQBRjaKTdBAGS',
    NULL, -- No Twitter link provided
    'https://ipfs.io/ipfs/QmXGfVVHV3VWTcagwBh9TcK5rRtico3zUYah2PDyS56HHW',
    NULL, -- No banner URL provided
    'https://bags.fm/Eme5T2s2HB7B8W4YgLG1eReQpnadEVUnQBRjaKTdBAGS',
    0
  ) RETURNING id INTO token_id;

  -- 2. Insert token ownership record with example royalty earners
  INSERT INTO token_ownership (
    token_id,
    deployer_user_id,
    current_owner,
    current_owner_user_id,
    royalty_earners,
    total_fees_earned,
    fees_owed_per_earner,
    fees_claimed_per_earner,
    total_fees_claimed
  ) VALUES (
    token_id,
    user_profile_id,
    'sample_wallet_address',
    user_profile_id,
    '[
      {
        "wallet": "sample_wallet_address",
        "social_platform": null,
        "social_handle": null,
        "social_or_wallet": "sample_wallet_address",
        "role": "Management",
        "percentage": 60,
        "is_manager": true
      },
      {
        "wallet": "community_wallet_address",
        "social_platform": null,
        "social_handle": null,
        "social_or_wallet": "community_wallet_address",
        "role": "Community",
        "percentage": 25,
        "is_manager": false
      },
      {
        "wallet": null,
        "social_platform": "X",
        "social_handle": "crypto_influencer",
        "social_or_wallet": "X:@crypto_influencer",
        "role": "Influencer",
        "percentage": 15,
        "is_manager": false
      }
    ]'::jsonb,
    0,
    '{}'::jsonb,
    '{}'::jsonb,
    0
  ) RETURNING id INTO ownership_id;

  -- 3. Create royalty agreement version
  INSERT INTO royalty_agreement_versions (
    token_id,
    platform_fee_bps,
    effective_from,
    effective_to,
    created_by
  ) VALUES (
    token_id,
    1000, -- 10% platform fee
    NOW(),
    NULL, -- Active agreement
    user_profile_id
  ) RETURNING id INTO agreement_version_id;

  -- 4. Insert royalty agreement version shares
  -- Note: Total BPS should equal 9000 (10000 - 1000 platform fee)
  INSERT INTO royalty_agreement_version_shares (
    agreement_version_id,
    earner_wallet,
    bps
  ) VALUES 
    (agreement_version_id, 'sample_wallet_address', 5400),      -- 60% = 5400 bps
    (agreement_version_id, 'community_wallet_address', 2250),   -- 25% = 2250 bps
    (agreement_version_id, 'X:@crypto_influencer', 1350);       -- 15% = 1350 bps

  -- 5. Record royalty change in history
  INSERT INTO royalty_changes_history (
    token_id,
    previous_royalty_earners,
    new_royalty_earners,
    changed_by_user_id,
    fees_at_change
  ) VALUES (
    token_id,
    NULL, -- No previous earners (first agreement)
    '[
      {
        "wallet": "sample_wallet_address",
        "social_platform": null,
        "social_handle": null,
        "social_or_wallet": "sample_wallet_address",
        "role": "Management",
        "percentage": 60,
        "is_manager": true
      },
      {
        "wallet": "community_wallet_address",
        "social_platform": null,
        "social_handle": null,
        "social_or_wallet": "community_wallet_address",
        "role": "Community",
        "percentage": 25,
        "is_manager": false
      },
      {
        "wallet": null,
        "social_platform": "X",
        "social_handle": "crypto_influencer",
        "social_or_wallet": "X:@crypto_influencer",
        "role": "Influencer",
        "percentage": 15,
        "is_manager": false
      }
    ]'::jsonb,
    user_profile_id,
    0
  );

  -- 6. Initialize fee accrual ledger entries
  INSERT INTO fee_accrual_ledger (
    token_id,
    entry_type,
    beneficiary_kind,
    beneficiary_wallet,
    amount_lamports,
    agreement_version_id
  ) VALUES 
    -- Platform entry
    (token_id, 'ACCRUAL', 'PLATFORM', 'platform', 0, agreement_version_id),
    -- Earner entries
    (token_id, 'ACCRUAL', 'EARNER', 'sample_wallet_address', 0, agreement_version_id),
    (token_id, 'ACCRUAL', 'EARNER', 'community_wallet_address', 0, agreement_version_id),
    (token_id, 'ACCRUAL', 'EARNER', 'X:@crypto_influencer', 0, agreement_version_id);

  -- 7. Update tokens table with is_listed flag
  UPDATE tokens 
  SET is_listed = false 
  WHERE id = token_id;

  RAISE NOTICE 'Successfully inserted CRM token with ID: %, ownership ID: %, agreement version ID: %', 
    token_id, ownership_id, agreement_version_id;

END $$;

-- Verify the data was inserted correctly
SELECT 
  t.name,
  t.symbol,
  t.contract_address,
  t.token_link,
  ownership.current_owner,
  ownership.royalty_earners,
  rav.platform_fee_bps,
  rav.effective_from,
  COUNT(ravs.id) as royalty_share_count,
  COUNT(fal.id) as ledger_entry_count
FROM tokens t
JOIN token_ownership ownership ON t.id = ownership.token_id
JOIN royalty_agreement_versions rav ON t.id = rav.token_id
LEFT JOIN royalty_agreement_version_shares ravs ON rav.id = ravs.agreement_version_id
LEFT JOIN fee_accrual_ledger fal ON t.id = fal.token_id
WHERE t.symbol = 'CRM'
GROUP BY t.id, t.name, t.symbol, t.contract_address, t.token_link, ownership.current_owner, ownership.royalty_earners, rav.platform_fee_bps, rav.effective_from;
