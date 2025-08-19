'use client';

import React, { useState } from 'react';
import { ArrowLeft, User, Camera, Twitter, MessageCircle, Globe, Save, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useWallet } from '@/components/ui/WalletProvider';

interface ProfileData {
  username: string;
  bio: string;
  twitterHandle: string;
  discordHandle: string;
  website: string;
  profileImage: string | null;
}

const ProfilePage: React.FC = () => {
  const { isConnected, publicKey } = useWallet();
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    bio: '',
    twitterHandle: '',
    discordHandle: '',
    website: '',
    profileImage: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsEditing(false);
      setIsSaving(false);
      alert('Profile updated successfully!');
    }, 1000);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data
    setImagePreview(null);
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
                <h3 className="text-lg font-semibold text-text-primary">Social Links</h3>
                
                {/* Twitter */}
                <div>
                  <label htmlFor="twitter" className="block text-sm font-medium text-text-primary mb-2">
                    <div className="flex items-center space-x-2">
                      <Twitter className="w-4 h-4" />
                      <span>Twitter Handle</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    id="twitter"
                    value={profileData.twitterHandle}
                    onChange={(e) => handleInputChange('twitterHandle', e.target.value)}
                    disabled={!isEditing}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Discord */}
                <div>
                  <label htmlFor="discord" className="block text-sm font-medium text-text-primary mb-2">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4" />
                      <span>Discord Handle</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    id="discord"
                    value={profileData.discordHandle}
                    onChange={(e) => handleInputChange('discordHandle', e.target.value)}
                    disabled={!isEditing}
                    placeholder="username#1234"
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
