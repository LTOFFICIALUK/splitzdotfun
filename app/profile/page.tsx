'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Camera, 
  Twitter, 
  MessageCircle, 
  Globe, 
  Save, 
  X,
  Instagram,
  Youtube,
  Twitch,
  TikTok,
  Linkedin,
  Github,
  Telegram,
  Discord,
  Facebook,
  Reddit,
  Medium,
  Patreon,
  OnlyFans,
  Snapchat,
  Pinterest,
  Spotify,
  Apple,
  ChevronDown
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useWallet } from '@/components/ui/WalletProvider';
import { getProfile, createProfile, updateProfile, uploadProfileImage, Profile } from '@/lib/supabase';

interface SocialLink {
  platform: string;
  handle: string;
  url: string;
  icon: React.ReactNode;
}

interface ProfileData {
  username: string;
  bio: string;
  website: string;
  profileImage: string | null;
  socialLinks: SocialLink[];
}

const socialPlatforms = [
  { key: 'twitter', name: 'Twitter/X', icon: <Twitter className="w-4 h-4" />, placeholder: '@username' },
  { key: 'instagram', name: 'Instagram', icon: <Instagram className="w-4 h-4" />, placeholder: '@username' },
  { key: 'youtube', name: 'YouTube', icon: <Youtube className="w-4 h-4" />, placeholder: 'Channel name' },
  { key: 'twitch', name: 'Twitch', icon: <Twitch className="w-4 h-4" />, placeholder: 'username' },
  { key: 'tiktok', name: 'TikTok', icon: <TikTok className="w-4 h-4" />, placeholder: '@username' },
  { key: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, placeholder: 'Profile URL' },
  { key: 'github', name: 'GitHub', icon: <Github className="w-4 h-4" />, placeholder: 'username' },
  { key: 'telegram', name: 'Telegram', icon: <Telegram className="w-4 h-4" />, placeholder: '@username' },
  { key: 'discord', name: 'Discord', icon: <Discord className="w-4 h-4" />, placeholder: 'username#1234' },
  { key: 'facebook', name: 'Facebook', icon: <Facebook className="w-4 h-4" />, placeholder: 'Profile URL' },
  { key: 'reddit', name: 'Reddit', icon: <Reddit className="w-4 h-4" />, placeholder: 'u/username' },
  { key: 'medium', name: 'Medium', icon: <Medium className="w-4 h-4" />, placeholder: '@username' },
  { key: 'patreon', name: 'Patreon', icon: <Patreon className="w-4 h-4" />, placeholder: 'username' },
  { key: 'onlyfans', name: 'OnlyFans', icon: <OnlyFans className="w-4 h-4" />, placeholder: 'username' },
  { key: 'snapchat', name: 'Snapchat', icon: <Snapchat className="w-4 h-4" />, placeholder: 'username' },
  { key: 'pinterest', name: 'Pinterest', icon: <Pinterest className="w-4 h-4" />, placeholder: 'username' },
  { key: 'spotify', name: 'Spotify', icon: <Spotify className="w-4 h-4" />, placeholder: 'Artist/Playlist URL' },
  { key: 'apple', name: 'Apple Music', icon: <Apple className="w-4 h-4" />, placeholder: 'Artist/Playlist URL' },
];

const ProfilePage: React.FC = () => {
  const { isConnected, publicKey } = useWallet();
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    bio: '',
    website: '',
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
      const newSocialLink: SocialLink = {
        platform,
        handle: '',
        url: '',
        icon: platformData.icon
      };
      setProfileData(prev => ({
        ...prev,
        socialLinks: [...prev.socialLinks, newSocialLink]
      }));
    }
    setShowSocialDropdown(false);
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
    return socialPlatforms.find(p => p.key === platformKey)?.icon || <Globe className="w-4 h-4" />;
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
          const profile = await getProfile(publicKey);
          if (profile) {
            setOriginalProfile(profile);
            setProfileData({
              username: profile.username || '',
              bio: profile.bio || '',
              website: profile.website || '',
              profileImage: profile.profile_image_url,
              socialLinks: profile.social_links || []
            });
            setImagePreview(profile.profile_image_url);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProfile();
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
    if (!publicKey) return;
    
    setIsSaving(true);
    try {
      // Handle image upload if there's a new image
      let profileImageUrl = profileData.profileImage;
      if (imagePreview && imagePreview !== originalProfile?.profile_image_url) {
        // Convert base64 to file if needed
        if (imagePreview.startsWith('data:')) {
          const response = await fetch(imagePreview);
          const blob = await response.blob();
          const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });
          profileImageUrl = await uploadProfileImage(file, publicKey);
        }
      }

      const profileDataToSave = {
        wallet_address: publicKey,
        username: profileData.username,
        bio: profileData.bio,
        website: profileData.website,
        profile_image_url: profileImageUrl,
        social_links: profileData.socialLinks
      };

      let savedProfile;
      if (originalProfile) {
        // Update existing profile
        savedProfile = await updateProfile(publicKey, profileDataToSave);
      } else {
        // Create new profile
        savedProfile = await createProfile(profileDataToSave);
      }

      if (savedProfile) {
        setOriginalProfile(savedProfile);
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
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
        website: originalProfile.website || '',
        profileImage: originalProfile.profile_image_url,
        socialLinks: originalProfile.social_links || []
      });
      setImagePreview(originalProfile.profile_image_url);
    } else {
      setProfileData({
        username: '',
        bio: '',
        website: '',
        profileImage: null,
        socialLinks: []
      });
      setImagePreview(null);
    }
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

              {/* Social Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Social Links</h3>
                  {isEditing && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSocialDropdown(!showSocialDropdown)}
                        className="flex items-center space-x-2 px-3 py-1 bg-background-elevated text-text-primary rounded-lg hover:bg-background-dark transition-colors"
                      >
                        <span className="text-sm">Add Social</span>
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
                                  <span className="text-xs text-text-secondary ml-auto">Added</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-text-primary mb-2">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                    </div>
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={profileData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Social Links List */}
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-3 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold rounded-xl hover:opacity-90 transition-all duration-200"
                >
                  Edit Profile
                </button>
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
                    disabled={isSaving}
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
                  </button>
                </>
              )}
            </div>
              </>
            )}
          </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
