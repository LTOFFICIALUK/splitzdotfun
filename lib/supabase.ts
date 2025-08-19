import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface Profile {
  id: string;
  wallet_address: string;
  username: string;
  bio: string;
  website: string;
  profile_image_url: string | null;
  social_links: SocialLink[];
  created_at: string;
  updated_at: string;
}

export interface SocialLink {
  platform: string;
  handle: string;
  url: string;
}

// Profile management functions
export const getProfile = async (walletAddress: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

export const createProfile = async (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([profile])
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }

  return data;
};

export const updateProfile = async (walletAddress: string, updates: Partial<Profile>): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('wallet_address', walletAddress)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
};

// File upload functions
export const uploadProfileImage = async (file: File, walletAddress: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${walletAddress}-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('profile-images')
    .upload(fileName, file);

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile-images')
    .getPublicUrl(fileName);

  return publicUrl;
};

export const deleteProfileImage = async (fileName: string): Promise<boolean> => {
  const { error } = await supabase.storage
    .from('profile-images')
    .remove([fileName]);

  if (error) {
    console.error('Error deleting image:', error);
    return false;
  }

  return true;
};
