-- Fix the update_oauth_verification function to avoid ambiguous column references
CREATE OR REPLACE FUNCTION update_oauth_verification(
  p_wallet_address TEXT,
  p_platform TEXT,
  p_is_verified BOOLEAN,
  p_oauth_token TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update the profile with OAuth verification
  INSERT INTO profiles (wallet_address, oauth_verifications)
  VALUES (p_wallet_address, jsonb_build_object(p_platform, jsonb_build_object(
    'is_verified', p_is_verified,
    'oauth_token', p_oauth_token,
    'verified_at', NOW()
  )))
  ON CONFLICT (wallet_address) DO UPDATE SET
    oauth_verifications = profiles.oauth_verifications || jsonb_build_object(p_platform, jsonb_build_object(
      'is_verified', p_is_verified,
      'oauth_token', p_oauth_token,
      'verified_at', NOW()
    ));
END;
$$ LANGUAGE plpgsql;
