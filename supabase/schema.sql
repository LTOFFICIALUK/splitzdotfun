-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  bio TEXT,
  website TEXT,
  profile_image_url TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
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

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;
