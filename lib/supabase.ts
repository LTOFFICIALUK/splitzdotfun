import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client with better error handling
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are not configured. Please check your .env.local file.');
    return null;
  }
  
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
})();

// Database types for TypeScript
export interface Profile {
  id: string;
  wallet_address: string;
  username: string;
  bio: string;
  profile_image_url: string | null;
  social_links: SocialLink[];
  oauth_verifications?: Record<string, {
    is_verified: boolean;
    oauth_token?: string;
    verified_at?: string;
  }>;
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
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching profile:', error);
    return null;
  }
};

export const createProfile = async (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile | null> => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating profile:', error);
    return null;
  }
};

export const updateProfile = async (walletAddress: string, updates: Partial<Profile>): Promise<Profile | null> => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('wallet_address', walletAddress)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating profile:', error);
    return null;
  }
};

// Test function to verify Supabase configuration
export const testSupabaseConfig = async () => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    console.log('Testing Supabase configuration...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    console.log('Anon Key starts with:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
    
    // Test basic Supabase connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    console.log('Database connection test:', { data, error });
    
    if (error) {
      console.error('Database connection failed:', error);
      return false;
    }
    
    console.log('Database connection: SUCCESS');
    return true;
  } catch (error) {
    console.error('Supabase config test error:', error);
    return false;
  }
};

// Test function to verify bucket access (without listing all buckets)
export const testBucketAccess = async () => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    console.log('Testing bucket access via file list...');
    // Try to list within the known bucket (root folder)
    const { data: bucketFiles, error: filesError } = await supabase.storage
      .from('profile-images')
      .list('', { limit: 1 });
    
    console.log('Bucket access test result:', { bucketFiles, error: filesError });
    
    return !filesError;
  } catch (error) {
    console.error('Test bucket access error:', error);
    return false;
  }
};

// File upload functions
export const uploadProfileImage = async (file: File, walletAddress: string): Promise<string | null> => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    console.log('Starting image upload for wallet:', walletAddress);
    console.log('File details:', file.name, file.size, 'bytes, type:', file.type);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${walletAddress}/${walletAddress}-${Date.now()}.${fileExt}`;
    console.log('Generated filename:', fileName);

    // Test bucket access first (no global listing)
    const bucketAccessible = await testBucketAccess();
    if (!bucketAccessible) {
      console.error('Bucket is not accessible. Please check your Supabase configuration.');
      return null;
    }

    // Attempt upload directly
    console.log('Bucket access test passed, attempting upload...');
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg'
      });

    if (error) {
      console.error('Error uploading image:', error);
      console.log('Error details:', {
        message: error.message,
        name: error.name
      });
      return null;
    }

    console.log('Upload successful:', data);

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    console.log('Public URL generated:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Unexpected error uploading image:', error);
    return null;
  }
};
