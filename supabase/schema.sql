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
