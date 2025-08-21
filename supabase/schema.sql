-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_oauth_verification();
DROP TABLE IF EXISTS profiles;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  bio TEXT,
  profile_image_url TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  oauth_verifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create OAuth verification function
CREATE OR REPLACE FUNCTION update_oauth_verification(
  p_wallet_address TEXT,
  p_platform TEXT,
  p_is_verified BOOLEAN,
  p_oauth_token TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update the profile with OAuth verification
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
END;
$$ LANGUAGE plpgsql;

-- Enable RLS and add permissive policies for profiles (public demo)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Public read profiles'
  ) THEN
    CREATE POLICY "Public read profiles" ON profiles
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Public insert profiles'
  ) THEN
    CREATE POLICY "Public insert profiles" ON profiles
      FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Public update profiles'
  ) THEN
    CREATE POLICY "Public update profiles" ON profiles
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS for storage.objects and add policies for the profile-images bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read profile-images'
  ) THEN
    CREATE POLICY "Public read profile-images" ON storage.objects
      FOR SELECT USING (bucket_id = 'profile-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public insert profile-images'
  ) THEN
    CREATE POLICY "Public insert profile-images" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'profile-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public update profile-images'
  ) THEN
    CREATE POLICY "Public update profile-images" ON storage.objects
      FOR UPDATE USING (bucket_id = 'profile-images') WITH CHECK (bucket_id = 'profile-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public delete profile-images'
  ) THEN
    CREATE POLICY "Public delete profile-images" ON storage.objects
      FOR DELETE USING (bucket_id = 'profile-images');
  END IF;
END $$;

-- Create royalty changes history table
CREATE TABLE IF NOT EXISTS royalty_changes_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  previous_royalty_earners JSONB,
  new_royalty_earners JSONB NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by_user_id UUID,
  fees_at_change DECIMAL(20,8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_royalty_changes_token_id ON royalty_changes_history(token_id);
CREATE INDEX IF NOT EXISTS idx_royalty_changes_changed_at ON royalty_changes_history(changed_at);

-- Add comment
COMMENT ON TABLE royalty_changes_history IS 'Tracks historical changes to royalty distributions for tokens';

-- Create marketplace listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_price DECIMAL(20,8) NOT NULL,
  description TEXT,
  new_owner_fee_share DECIMAL(5,2) NOT NULL, -- Percentage for new owner (0-100)
  proposed_fee_splits JSONB NOT NULL, -- Array of fee split objects with time locks
  is_active BOOLEAN DEFAULT true,
  is_sold BOOLEAN DEFAULT false,
  buyer_user_id UUID REFERENCES profiles(id), -- Set when sold
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_token_id ON marketplace_listings(token_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_buyer ON marketplace_listings(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active ON marketplace_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_sold ON marketplace_listings(is_sold);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON marketplace_listings(created_at);

-- Add updated_at trigger for marketplace_listings
CREATE TRIGGER update_marketplace_listings_updated_at 
  BEFORE UPDATE ON marketplace_listings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE marketplace_listings IS 'Stores marketplace listings for token management transfers';

-- Add is_listed column to tokens table
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT false;

-- Add index for efficient queries on is_listed
CREATE INDEX IF NOT EXISTS idx_tokens_is_listed ON tokens(is_listed);

-- Add comment for the new column
COMMENT ON COLUMN tokens.is_listed IS 'Indicates if the token has an active marketplace listing';

-- Enable RLS for marketplace_listings
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for marketplace_listings
DO $$
BEGIN
  -- Public read access for active listings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Public read active listings'
  ) THEN
    CREATE POLICY "Public read active listings" ON marketplace_listings
      FOR SELECT USING (is_active = true);
  END IF;

  -- Users can read their own listings (active or not)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Users can read own listings'
  ) THEN
    CREATE POLICY "Users can read own listings" ON marketplace_listings
      FOR SELECT USING (seller_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);
  END IF;

  -- Users can insert their own listings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Users can insert own listings'
  ) THEN
    CREATE POLICY "Users can insert own listings" ON marketplace_listings
      FOR INSERT WITH CHECK (seller_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);
  END IF;

  -- Users can update their own listings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Users can update own listings'
  ) THEN
    CREATE POLICY "Users can update own listings" ON marketplace_listings
      FOR UPDATE USING (seller_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);
  END IF;

  -- Users can delete their own listings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Users can delete own listings'
  ) THEN
    CREATE POLICY "Users can delete own listings" ON marketplace_listings
      FOR DELETE USING (seller_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);
  END IF;
END $$;
