-- Add OAuth verification column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS oauth_verifications JSONB DEFAULT '{}'::jsonb;

-- Create OAuth verification function
CREATE OR REPLACE FUNCTION update_oauth_verification(
  wallet_address TEXT,
  platform TEXT,
  is_verified BOOLEAN,
  oauth_token TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update the profile with OAuth verification
  INSERT INTO profiles (wallet_address, oauth_verifications)
  VALUES (wallet_address, jsonb_build_object(platform, jsonb_build_object(
    'is_verified', is_verified,
    'oauth_token', oauth_token,
    'verified_at', NOW()
  )))
  ON CONFLICT (wallet_address) DO UPDATE SET
    oauth_verifications = profiles.oauth_verifications || jsonb_build_object(platform, jsonb_build_object(
      'is_verified', is_verified,
      'oauth_token', oauth_token,
      'verified_at', NOW()
    ));
END;
$$ LANGUAGE plpgsql;
