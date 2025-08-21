-- Insert a test token with the real contract address
-- First, let's create a test profile if none exists
INSERT INTO profiles (wallet_address, username, bio, profile_image_url)
VALUES (
  'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS', -- Using the contract address as wallet for demo
  'test_deployer',
  'Test token deployer for demo purposes',
  'https://arweave.net/8AKeunEmIMk-UfVUnSR1SK0LKL2pGzlpQdDMBkbu5HM'
)
ON CONFLICT (wallet_address) DO NOTHING;

-- Now insert the token record
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
  (SELECT id FROM profiles WHERE wallet_address = 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS'),
  'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
  'BAGS Token',
  'BAGS',
  'A test token for demonstrating the SplitzFun platform features. This token showcases real-time charting, market data, and token management capabilities.',
  'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
  'https://splitz.fun/token/FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
  'https://twitter.com/bagsapp',
  'https://arweave.net/8AKeunEmIMk-UfVUnSR1SK0LKL2pGzlpQdDMBkbu5HM',
  'https://arweave.net/8AKeunEmIMk-UfVUnSR1SK0LKL2pGzlpQdDMBkbu5HM',
  'https://arweave.net/metadata/bags-token.json',
  1250.50
)
ON CONFLICT (contract_address) DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  description = EXCLUDED.description,
  token_link = EXCLUDED.token_link,
  social_link = EXCLUDED.social_link,
  image_url = EXCLUDED.image_url,
  banner_url = EXCLUDED.banner_url,
  metadata_url = EXCLUDED.metadata_url,
  fees_generated = EXCLUDED.fees_generated,
  updated_at = NOW();

-- Insert token ownership record
INSERT INTO token_ownership (
  token_id,
  deployer_user_id,
  current_owner,
  current_owner_user_id,
  royalty_earners,
  ownership_history,
  total_fees_earned,
  fees_owed_per_earner,
  fees_claimed_per_earner,
  total_fees_claimed
) VALUES (
  (SELECT id FROM tokens WHERE contract_address = 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS'),
  (SELECT id FROM profiles WHERE wallet_address = 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS'),
  'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
  (SELECT id FROM profiles WHERE wallet_address = 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS'),
  '[
    {"social_or_wallet": "FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS", "role": "Creator", "percentage": 70},
    {"social_or_wallet": "@bagsapp", "role": "Management", "percentage": 30}
  ]'::jsonb,
  '[
    {"owner": "FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS", "from": "2024-01-01T00:00:00Z", "to": null}
  ]'::jsonb,
  1250.50,
  '{"FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS": 875.35, "@bagsapp": 375.15}'::jsonb,
  '{"FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS": 500.00, "@bagsapp": 200.00}'::jsonb,
  700.00
)
ON CONFLICT (token_id) DO UPDATE SET
  current_owner = EXCLUDED.current_owner,
  current_owner_user_id = EXCLUDED.current_owner_user_id,
  royalty_earners = EXCLUDED.royalty_earners,
  ownership_history = EXCLUDED.ownership_history,
  total_fees_earned = EXCLUDED.total_fees_earned,
  fees_owed_per_earner = EXCLUDED.fees_owed_per_earner,
  fees_claimed_per_earner = EXCLUDED.fees_claimed_per_earner,
  total_fees_claimed = EXCLUDED.total_fees_claimed,
  updated_at = NOW();

-- Verify the insertion
SELECT 
  t.name,
  t.symbol,
  t.contract_address,
  t.fees_generated,
  to.current_owner,
  to.total_fees_earned
FROM tokens t
LEFT JOIN token_ownership to ON t.id = to.token_id
WHERE t.contract_address = 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS';
