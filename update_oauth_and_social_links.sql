-- Function to update both OAuth verification and social links
CREATE OR REPLACE FUNCTION update_oauth_verification_and_social_links(
  p_wallet_address TEXT,
  p_platform TEXT,
  p_is_verified BOOLEAN,
  p_oauth_token TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- First, update OAuth verification
  INSERT INTO profiles (wallet_address, oauth_verifications)
  VALUES (p_wallet_address, jsonb_build_object(p_platform, jsonb_build_object(
    'is_verified', p_is_verified,
    'oauth_token', p_oauth_token,
    'username', p_username,
    'verified_at', NOW()
  )))
  ON CONFLICT (wallet_address) DO UPDATE SET
    oauth_verifications = profiles.oauth_verifications || jsonb_build_object(p_platform, jsonb_build_object(
      'is_verified', p_is_verified,
      'oauth_token', p_oauth_token,
      'username', p_username,
      'verified_at', NOW()
    ));

  -- Then, update or add social link
  IF p_is_verified AND p_username IS NOT NULL THEN
    -- Check if social link already exists for this platform
    IF EXISTS (
      SELECT 1 FROM profiles 
      WHERE wallet_address = p_wallet_address 
      AND social_links @> jsonb_build_array(jsonb_build_object('platform', p_platform))
    ) THEN
      -- Update existing social link
      UPDATE profiles 
      SET social_links = (
        SELECT jsonb_agg(
          CASE 
            WHEN link->>'platform' = p_platform 
            THEN jsonb_build_object(
              'platform', p_platform,
              'handle', p_username,
              'url', 'https://' || lower(p_platform) || '.com/' || p_username
            )
            ELSE link
          END
        )
        FROM jsonb_array_elements(social_links) AS link
      )
      WHERE wallet_address = p_wallet_address;
    ELSE
      -- Add new social link
      UPDATE profiles 
      SET social_links = COALESCE(social_links, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'platform', p_platform,
          'handle', p_username,
          'url', 'https://' || lower(p_platform) || '.com/' || p_username
        )
      )
      WHERE wallet_address = p_wallet_address;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
