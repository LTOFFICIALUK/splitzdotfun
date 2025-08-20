'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Camera, 
  MessageCircle, 
  Save,
  X,
  ChevronDown
} from 'lucide-react';
import { 
  FaXTwitter, 
  FaInstagram, 
  FaYoutube, 
  FaTwitch, 
  FaLinkedin, 
  FaGithub, 
  FaTiktok
} from 'react-icons/fa6';
import { 
  SiKick, 
  SiRumble 
} from 'react-icons/si';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useWallet } from '@/components/ui/WalletProvider';
import { getProfile, createProfile, updateProfile, uploadProfileImage, testBucketAccess, testSupabaseConfig, Profile } from '@/lib/supabase';

// PKCE helper functions for OAuth 2.0
// RFC 7636: code_verifier must be 43-128 chars of [A-Z a-z 0-9 - . _ ~]
const generateCodeVerifier = () => {
  const length = 64; // within 43-128
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
};

const generateCodeChallenge = async (verifier: string) => {
  // Hash the provided verifier with SHA256 for the challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
  
  return hashBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const toBase64Url = (base64: string) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');

const generateOAuthState = (walletAddress: string, codeVerifier: string) => {
  // Use a simple random string like the working example
  // For now, just return a simple state and we'll handle code_verifier differently
  return Math.random().toString(36).substring(2, 15);
};

interface ProfileSocialLink {
  platform: string;
  handle: string;
  url: string;
  isVerified: boolean;
  oauthToken?: string;
}

interface ProfileData {
  username: string;
  bio: string;
  profileImage: string | null;
  socialLinks: ProfileSocialLink[];
}

const socialPlatforms = [
  { key: 'X', name: 'X', icon: <FaXTwitter className="w-4 h-4" />, placeholder: '@username' },
  { key: 'Instagram', name: 'Instagram', icon: <FaInstagram className="w-4 h-4" />, placeholder: '@username' },
  { key: 'Instagram Threads', name: 'Instagram Threads', icon: <MessageCircle className="w-4 h-4" />, placeholder: '@username' },
  { key: 'TikTok', name: 'TikTok', icon: <FaTiktok className="w-4 h-4" />, placeholder: '@username' },
  { key: 'YouTube', name: 'YouTube', icon: <FaYoutube className="w-4 h-4" />, placeholder: 'Channel name' },
  { key: 'GitHub', name: 'GitHub', icon: <FaGithub className="w-4 h-4" />, placeholder: 'username' },
  { key: 'LinkedIn', name: 'LinkedIn', icon: <FaLinkedin className="w-4 h-4" />, placeholder: 'Profile URL' },
  { key: 'Twitch', name: 'Twitch', icon: <FaTwitch className="w-4 h-4" />, placeholder: 'username' },
  { key: 'Kick', name: 'Kick', icon: <SiKick className="w-4 h-4" />, placeholder: 'username' },
  { key: 'Rumble', name: 'Rumble', icon: <SiRumble className="w-4 h-4" />, placeholder: 'username' },
];

const ProfilePage: React.FC = () => {
  const { isConnected, publicKey } = useWallet();
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    bio: '',
    profileImage: null,
    socialLinks: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSocialDropdown, setShowSocialDropdown] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSocialLink = (platform: string) => {
    const platformData = socialPlatforms.find(p => p.key === platform);
    if (platformData) {
      const newSocialLink: ProfileSocialLink = {
        platform,
        handle: '',
        url: '',
        isVerified: false
      };
      setProfileData(prev => ({
        ...prev,
        socialLinks: [...prev.socialLinks, newSocialLink]
      }));
    }
    setShowSocialDropdown(false);
  };

  const initiateOAuth = async (platform: string) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }



    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    // Minimal debug to ensure PKCE parts are consistent
    // console.log('PKCE lengths', { v: codeVerifier.length, c: codeChallenge.length });
    
    const oauthUrls = {
      'X': `https://twitter.com/i/oauth2/authorize?response_type=code&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI || 'https://splitz.fun/api/auth/twitter')}&scope=${encodeURIComponent('tweet.read users.read offline.access')}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${encodeURIComponent(generateOAuthState(publicKey, codeVerifier))}&client_id=${process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID}`,
      'YouTube': `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI || 'https://splitz.fun/api/auth/youtube')}&scope=https://www.googleapis.com/auth/youtube.readonly%20https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/userinfo.email%20openid&response_type=code&state=${publicKey}`,
      'GitHub': `https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || 'https://splitz.fun/api/auth/github')}&scope=read:user&state=${publicKey}`,
      'Twitch': `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || 'https://splitz.fun/api/auth/twitch')}&scope=user:read:email&state=${publicKey}`,
      'TikTok': `https://www.tiktok.com/v2/auth/authorize?client_key=${process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI || 'https://splitz.fun/api/auth/tiktok')}&scope=user.info.basic&response_type=code&state=${publicKey}`
    };
    
    const oauthUrl = oauthUrls[platform as keyof typeof oauthUrls];
    if (oauthUrl) {
      window.location.href = oauthUrl;
    } else {
      console.error(`OAuth not implemented for ${platform}`);
      alert(`OAuth verification for ${platform} is not yet implemented.`);
    }
  };

  const updateSocialLink = (index: number, field: 'handle' | 'url', value: string) => {
    setProfileData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeSocialLink = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  const getPlatformName = (platformKey: string) => {
    return socialPlatforms.find(p => p.key === platformKey)?.name || platformKey;
  };

  const getPlatformIcon = (platformKey: string) => {
    return socialPlatforms.find(p => p.key === platformKey)?.icon || <FaInstagram className="w-4 h-4" />;
  };

  const getPlatformPlaceholder = (platformKey: string) => {
    return socialPlatforms.find(p => p.key === platformKey)?.placeholder || 'Enter handle';
  };

  const isPlatformAdded = (platformKey: string) => {
    return profileData.socialLinks.some(link => link.platform === platformKey);
  };

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (publicKey) {
        setIsLoading(true);
        try {
          console.log('Loading profile for wallet:', publicKey);
          const profile = await getProfile(publicKey);
          if (profile) {
            console.log('Profile loaded successfully:', profile);
            setOriginalProfile(profile);
            setProfileData({
              username: profile.username || '',
              bio: profile.bio || '',
              profileImage: profile.profile_image_url,
              socialLinks: (profile.social_links || []).map(link => ({
                ...link,
                isVerified: false // Default to false for existing links
              }))
            });
            setImagePreview(profile.profile_image_url);
          } else {
            console.log('No existing profile found for wallet:', publicKey);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          // Silently handle error - user will see empty form
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProfile();
  }, [publicKey]);

  // Handle OAuth callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    const username = urlParams.get('username');
    const error = urlParams.get('error');

    if (verified && username && publicKey) {
      // Update the profile data with verified status
      setProfileData(prev => ({
        ...prev,
        socialLinks: prev.socialLinks.map(link => 
          link.platform === verified 
            ? { ...link, isVerified: true, handle: username }
            : link
        )
      }));

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show success message
      alert(`Successfully verified ${verified} account: ${username}`);
    }

    if (error) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show error message
      alert(`OAuth verification failed: ${error}`);
    }
  }, [publicKey]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setProfileData(prev => ({
          ...prev,
          profileImage: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setProfileData(prev => ({
      ...prev,
      profileImage: null
    }));
  };

  const handleSave = async () => {
    if (!publicKey) {
      console.error('No public key available for saving profile');
      return;
    }

    // Check if any social links are unverified
    const unverifiedLinks = profileData.socialLinks.filter(link => !link.isVerified);
    if (unverifiedLinks.length > 0) {
      alert('Please verify ownership of all connected social accounts before saving.');
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('Starting profile save for wallet:', publicKey);
      console.log('Current imagePreview:', imagePreview);
      console.log('Original profile image:', originalProfile?.profile_image_url);
      
      // Handle image upload if there's a new image
      let profileImageUrl = profileData.profileImage;
      if (imagePreview && imagePreview !== originalProfile?.profile_image_url) {
        console.log('Processing new profile image...');
        // Convert base64 to file if needed
        if (imagePreview.startsWith('data:')) {
          console.log('Converting base64 image to file...');
          try {
            const response = await fetch(imagePreview);
            const blob = await response.blob();
            console.log('Blob created:', blob.size, 'bytes, type:', blob.type);
            
            const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });
            console.log('File created:', file.name, file.size, 'bytes');
            
            profileImageUrl = await uploadProfileImage(file, publicKey);
            console.log('Image upload result:', profileImageUrl);
            
            if (!profileImageUrl) {
              console.error('Image upload failed - no URL returned');
              return;
            }
          } catch (imageError) {
            console.error('Error processing image:', imageError);
            return;
          }
        } else {
          console.log('Image is already a URL, using directly:', imagePreview);
          profileImageUrl = imagePreview;
        }
      } else {
        console.log('No new image to upload, keeping existing:', profileImageUrl);
      }

      const profileDataToSave = {
        wallet_address: publicKey,
        username: profileData.username,
        bio: profileData.bio,
        profile_image_url: profileImageUrl,
        social_links: profileData.socialLinks
      };

      console.log('Profile data to save:', profileDataToSave);

      let savedProfile;
      if (originalProfile) {
        // Update existing profile
        console.log('Updating existing profile...');
        savedProfile = await updateProfile(publicKey, profileDataToSave);
      } else {
        // Create new profile
        console.log('Creating new profile...');
        savedProfile = await createProfile(profileDataToSave);
      }

      if (savedProfile) {
        console.log('Profile saved successfully:', savedProfile);
        setOriginalProfile(savedProfile);
        setIsEditing(false);
      } else {
        console.error('Failed to save profile - no data returned');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data
    if (originalProfile) {
              setProfileData({
          username: originalProfile.username || '',
          bio: originalProfile.bio || '',
          profileImage: originalProfile.profile_image_url,
          socialLinks: (originalProfile.social_links || []).map(link => ({
            ...link,
            isVerified: false // Default to false for existing links
          }))
        });
      setImagePreview(originalProfile.profile_image_url);
    } else {
      setProfileData({
        username: '',
        bio: '',
        profileImage: null,
        socialLinks: []
      });
      setImagePreview(null);
    }
  };

  const handleTestBucketAccess = async () => {
    console.log('Testing bucket access...');
    const isAccessible = await testBucketAccess();
    console.log('Bucket access test:', isAccessible ? 'SUCCESS' : 'FAILED');
  };

  const handleTestSupabaseConfig = async () => {
    console.log('Testing Supabase configuration...');
    const isWorking = await testSupabaseConfig();
    console.log('Supabase config test:', isWorking ? 'SUCCESS' : 'FAILED');
  };

  const formatWalletAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/profile" />
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-text-primary mb-4">Profile</h1>
              <p className="text-text-secondary mb-8">Please connect your wallet to view your profile.</p>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold rounded-xl hover:opacity-90 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <Header currentPath="/profile" />
      
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              Profile Settings
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Customize your profile with a username, bio, and social links to build your identity on SplitzFun.
            </p>
          </div>

          {/* Profile Form */}
          <div className="bg-background-card rounded-2xl border border-background-elevated p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-mint"></div>
                <span className="ml-3 text-text-secondary">Loading profile...</span>
              </div>
            ) : (
              <>
                {/* Profile Image Section */}
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-full bg-background-elevated border-4 border-background-elevated overflow-hidden">
                      {imagePreview ? (
                        <img 
                          src={imagePreview} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-text-secondary" />
                        </div>
                      )}
                    </div>
                    
                    {isEditing && (
                      <div className="absolute bottom-0 right-0">
                        <label htmlFor="profile-image" className="cursor-pointer">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary-mint to-primary-aqua rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                            <Camera className="w-5 h-5 text-background-dark" />
                          </div>
                        </label>
                        <input
                          id="profile-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {imagePreview && (
                          <button
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-text-secondary text-sm font-mono">
                      {formatWalletAddress(publicKey || '')}
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={profileData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your username"
                      className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      This will be your display name across the platform
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-text-primary mb-2">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Maximum 500 characters
                    </p>
                  </div>

                  {/* Connected Socials */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-text-primary">Connected Socials</h3>
                      {isEditing && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowSocialDropdown(!showSocialDropdown)}
                            className="flex items-center space-x-2 px-3 py-1 bg-background-elevated text-text-primary rounded-lg hover:bg-background-dark transition-colors"
                          >
                            <span className="text-sm">Connect Social</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSocialDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {/* Social Platform Dropdown */}
                          {showSocialDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-background-card border border-background-elevated rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                              <div className="py-2">
                                {socialPlatforms.map((platform) => (
                                  <button
                                    key={platform.key}
                                    onClick={() => addSocialLink(platform.key)}
                                    disabled={isPlatformAdded(platform.key)}
                                    className={`w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3 ${
                                      isPlatformAdded(platform.key) ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {platform.icon}
                                    <span className="text-sm">{platform.name}</span>
                                    {isPlatformAdded(platform.key) && (
                                      <span className="text-xs text-text-secondary ml-auto">Connected</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Connected Socials List */}
                    {profileData.socialLinks.length > 0 && (
                      <div className="space-y-3">
                        {profileData.socialLinks.map((link, index) => (
                          <div key={index} className="bg-background-dark rounded-lg p-4 border border-background-elevated">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                {getPlatformIcon(link.platform)}
                                <span className="text-sm font-medium text-text-primary">
                                  {getPlatformName(link.platform)}
                                </span>
                                {link.isVerified && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => removeSocialLink(index)}
                                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={link.handle}
                              onChange={(e) => updateSocialLink(index, 'handle', e.target.value)}
                              disabled={!isEditing}
                              placeholder={getPlatformPlaceholder(link.platform)}
                              className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {isEditing && !link.isVerified && (
                              <button
                                type="button"
                                onClick={() => initiateOAuth(link.platform)}
                                className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark text-sm font-medium rounded-lg hover:opacity-90 transition-all duration-200"
                              >
                                Verify Ownership via OAuth
                              </button>
                            )}
                            {isEditing && link.isVerified && (
                              <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <p className="text-xs text-green-400">
                                  ✓ Account verified via OAuth
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4 mt-8">
                  {!isEditing ? (
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-8 py-3 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold rounded-xl hover:opacity-90 transition-all duration-200"
                      >
                        Edit Profile
                      </button>

                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        className="px-8 py-3 bg-background-elevated text-text-primary font-semibold rounded-xl hover:bg-background-dark transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || profileData.socialLinks.some(link => !link.isVerified)}
                        className="px-8 py-3 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Changes</span>
                          </>
                        )}
                        {profileData.socialLinks.some(link => !link.isVerified) && (
                          <div className="mt-2 text-xs text-red-400">
                            Verify all connected social accounts to save
                          </div>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
