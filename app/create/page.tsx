'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Plus, 
  Trash2,
  ChevronDown,
  MessageCircle,
  Users,
  Shield,
  Heart,
  Wallet,
  Video,
  Music
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
import { getOrCreateProfile, Profile } from '@/lib/supabase';

interface RoyaltyRecipient {
  id: string;
  type: 'wallet' | 'social';
  identifier: string;
  percentage: number;
  label: string;
  isManager: boolean;
  role: string;
}

const SOCIAL_PLATFORMS = [
  { key: 'X', name: 'X', icon: <FaXTwitter className="w-4 h-4" /> },
  { key: 'Instagram', name: 'Instagram', icon: <FaInstagram className="w-4 h-4" /> },
  { key: 'Instagram Threads', name: 'Instagram Threads', icon: <MessageCircle className="w-4 h-4" /> },
  { key: 'TikTok', name: 'TikTok', icon: <FaTiktok className="w-4 h-4" /> },
  { key: 'YouTube', name: 'YouTube', icon: <FaYoutube className="w-4 h-4" /> },
  { key: 'GitHub', name: 'GitHub', icon: <FaGithub className="w-4 h-4" /> },
  { key: 'LinkedIn', name: 'LinkedIn', icon: <FaLinkedin className="w-4 h-4" /> },
  { key: 'Twitch', name: 'Twitch', icon: <FaTwitch className="w-4 h-4" /> },
  { key: 'Kick', name: 'Kick', icon: <SiKick className="w-4 h-4" /> },
  { key: 'Rumble', name: 'Rumble', icon: <SiRumble className="w-4 h-4" /> }
] as const;

const ROLES = [
  { key: 'Marketing', name: 'Marketing', icon: <MessageCircle className="w-4 h-4" /> },
  { key: 'Influencer', name: 'Influencer', icon: <Users className="w-4 h-4" /> },
  { key: 'Team', name: 'Team', icon: <Users className="w-4 h-4" /> },
  { key: 'Management', name: 'Management', icon: <Shield className="w-4 h-4" /> },
  { key: 'Community', name: 'Community', icon: <Heart className="w-4 h-4" /> }
] as const;

const CreateCoin: React.FC = () => {
  const { isConnected, publicKey, signAndSendTransaction, signTransaction } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    twitterUrl: '',
    telegramUrl: '',
    imageUrl: '',
    bannerUrl: '',
    initialBuyAmount: '0.01'
  });
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isProcessingRef = useRef(false);
  const [royaltyRecipients, setRoyaltyRecipients] = useState<RoyaltyRecipient[]>([
    {
      id: '1',
      type: 'wallet',
      identifier: '',
      percentage: 100,
      label: 'You (Creator)',
      isManager: true,
      role: 'Management'
    }
  ]);

  // Load user profile when wallet is connected
  const loadUserProfile = async () => {
    if (publicKey) {
      setIsLoadingProfile(true);
      try {
        const profile = await getOrCreateProfile(publicKey);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    }
  };

  // Load profile when wallet connects
  useEffect(() => {
    if (isConnected && publicKey) {
      loadUserProfile();
      // Set creator's wallet address
      setRoyaltyRecipients(prev => 
        prev.map((recipient, index) => 
          index === 0 
            ? { ...recipient, identifier: publicKey }
            : recipient
        )
      );
    }
  }, [isConnected, publicKey]);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      Object.keys(openDropdowns).forEach(dropdownKey => {
        const dropdownRef = dropdownRefs.current[dropdownKey];
        if (dropdownRef && !dropdownRef.contains(target)) {
          setOpenDropdowns(prev => ({ ...prev, [dropdownKey]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdowns]);

  // Get user's connected social platforms and wallet
  const getUserSocialPlatforms = () => {
    const platforms = [];
    
    // Add wallet address as first option
    if (publicKey) {
      platforms.push({
        platformKey: 'wallet',
        platformName: 'Wallet Address',
        platformIcon: <Wallet className="w-4 h-4" />,
        handle: publicKey,
        platform: 'wallet',
        url: ''
      });
    }
    
    // Add connected social platforms
    if (userProfile?.social_links) {
      userProfile.social_links.forEach(link => {
        const platform = SOCIAL_PLATFORMS.find(p => p.key.toLowerCase() === link.platform.toLowerCase());
        platforms.push({
          ...link,
          platformKey: platform?.key || link.platform,
          platformName: platform?.name || link.platform,
          platformIcon: platform?.icon || <MessageCircle className="w-4 h-4" />
        });
      });
    }
    
    return platforms;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          imageUrl: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBannerPreview(result);
        setFormData(prev => ({
          ...prev,
          bannerUrl: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      imageUrl: ''
    }));
  };

  const removeBanner = () => {
    setBannerPreview(null);
    setFormData(prev => ({
      ...prev,
      bannerUrl: ''
    }));
  };

  const addRoyaltyRecipient = () => {
    const newRecipient: RoyaltyRecipient = {
      id: Date.now().toString(),
      type: 'wallet',
      identifier: '',
      percentage: 0,
      label: '',
      isManager: false,
      role: ''
    };
    setRoyaltyRecipients(prev => [...prev, newRecipient]);
  };

  const removeRoyaltyRecipient = (id: string) => {
    setRoyaltyRecipients(prev => {
      const filtered = prev.filter(recipient => recipient.id !== id);
      
      // If we removed a recipient and the total is now less than 100%, 
      // automatically add the remaining percentage to the creator (first recipient)
      if (filtered.length > 0) {
        const total = filtered.reduce((sum, recipient) => sum + recipient.percentage, 0);
        if (total < 100) {
          const remaining = 100 - total;
          filtered[0].percentage += remaining;
        }
      }
      
      return filtered;
    });
  };

  const updateRoyaltyRecipient = (id: string, field: keyof RoyaltyRecipient, value: string | number | boolean) => {
    if (field === 'percentage') {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value as number;
      
      // Calculate what the total would be if we update this recipient
      const currentTotal = getTotalPercentage();
      const currentRecipientPercentage = royaltyRecipients.find(r => r.id === id)?.percentage || 0;
      const newTotal = currentTotal - currentRecipientPercentage + numValue;
      
      // If the new total would exceed 100%, don't allow the update
      if (newTotal > 100) {
        return;
      }
      
      // Ensure the percentage is within valid bounds
      const clampedValue = Math.max(0, Math.min(100, numValue));
      
      setRoyaltyRecipients(prev => prev.map(recipient => 
        recipient.id === id ? { ...recipient, [field]: clampedValue } : recipient
      ));
    } else if (field === 'isManager') {
      // When setting a new manager, remove management from all other recipients
      setRoyaltyRecipients(prev => prev.map(recipient => ({
        ...recipient,
        isManager: recipient.id === id ? value as boolean : false
      })));
    } else {
      setRoyaltyRecipients(prev => prev.map(recipient => 
        recipient.id === id ? { ...recipient, [field]: value } : recipient
      ));
    }
  };

  const getTotalPercentage = () => {
    return royaltyRecipients.reduce((total, recipient) => total + recipient.percentage, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submission started at:', new Date().toISOString());
    
    if (!isConnected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!isFormValid) {
      alert('Please fill in all required fields and ensure royalty percentages add up to 100% or less');
      return;
    }

    // Prevent multiple submissions using ref for immediate check
    if (isProcessingRef.current) {
      console.log('🚫 Form submission already in progress (ref check), ignoring duplicate submit');
      return;
    }

    isProcessingRef.current = true;
    setIsSubmitting(true);

    try {
      console.log('🚀 Starting token launch process...');
      console.log('📤 Form data:', {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        imageUrl: formData.imageUrl,
        twitterUrl: formData.twitterUrl,
        initialBuyAmount: parseFloat(formData.initialBuyAmount),
        userWallet: publicKey,
        royaltyRecipients
      });

      // Decide whether to skip payment (default: skip, to preserve current working flow)
      const skipPayment = (process.env.NEXT_PUBLIC_SKIP_PAYMENT as unknown as string) !== '0';

      let launchResponse: Response;

      if (skipPayment) {
        // Direct Bags launch (testing-only): call server launch route without payment verification
        console.log('🧪 TEST: Directly calling /api/launch-token to exercise Bags flow...');
        launchResponse = await fetch('/api/launch-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: formData.imageUrl,
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            userWallet: publicKey,
            initialBuyAmount: parseFloat(formData.initialBuyAmount),
            twitterUrl: formData.twitterUrl,
            telegram: formData.telegramUrl,
            website: ''
          }),
        });
      } else {
        // Payment + signing + server verification and launch (restored)
        const transactionId = Date.now().toString();
        console.log(`💰 Creating payment transaction (ID: ${transactionId})...`);
        const paymentResponse = await fetch('/api/create-payment-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userWallet: publicKey,
            initialBuyAmount: parseFloat(formData.initialBuyAmount),
            transactionId
          }),
        });
        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.error || 'Failed to create payment transaction');
        }
        const paymentData = await paymentResponse.json();

        console.log('🔐 Requesting user to sign and send payment transaction...');
        const { Transaction } = await import('@solana/web3.js');
        const paymentTx = Transaction.from(Buffer.from(paymentData.transaction, 'base64'));
        const paymentSignature = await signAndSendTransaction(paymentTx);
        console.log('✅ Payment transaction signature:', paymentSignature);

        console.log('🚀 Launching token with platform wallet (server-side verification)...');
        launchResponse = await fetch('/api/verify-payment-and-launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: formData.imageUrl,
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            userWallet: publicKey,
            initialBuyAmount: parseFloat(formData.initialBuyAmount),
            twitterUrl: formData.twitterUrl,
            telegram: formData.telegramUrl,
            website: ''
          }),
        });
      }

      if (!launchResponse.ok) {
        const errorData = await launchResponse.json();
        throw new Error(errorData.error || 'Failed to launch token');
      }

      const launchData = await launchResponse.json();
      console.log('✅ Token launched successfully:', launchData);

      // Step 4: Save token to database
      console.log('💾 Saving token to database...');
      const saveResponse = await fetch('/api/save-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deployer_user_id: userProfile?.id || null,
          deployer_social_or_wallet: publicKey,
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          contract_address: launchData.tokenMint,
          social_link: formData.twitterUrl,
          image_url: formData.imageUrl,
          banner_url: formData.bannerUrl,
          metadata_url: launchData.tokenMetadata,
          royalty_earners: royaltyRecipients.map(recipient => ({
            wallet: recipient.type === 'wallet' ? recipient.identifier : null,
            social_platform: recipient.type === 'social' ? recipient.identifier.split(':')[0] : null,
            social_handle: recipient.type === 'social' ? recipient.identifier.split(':')[1] : null,
            percentage: recipient.percentage,
            role: recipient.role,
            is_manager: recipient.isManager
          }))
        }),
      });

      if (!saveResponse.ok) {
        console.warn('⚠️ Failed to save token to database, but token was launched successfully');
      } else {
        console.log('✅ Token saved to database');
      }

      // Step 5: Show success message and redirect
      console.log('🎉 Token launched successfully!');
      console.log('🪙 Token Mint:', launchData.tokenMint);
      console.log('🔑 Launch Signature:', launchData.signature);
      console.log('🌐 View your token at:', launchData.splitzUrl);
      
      alert(`🎉 Token launched successfully!\n\nToken: ${formData.name} (${formData.symbol})\nMint: ${launchData.tokenMint}\n\nView your token at: ${launchData.splitzUrl}`);
      
      // Redirect to the token page
      window.location.href = launchData.splitzUrl;
      
    } catch (error) {
      console.error('❌ Token launch error:', error);
      alert(`❌ Token launch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      isProcessingRef.current = false;
    }
  };

  const hasManagerAssigned = () => {
    return royaltyRecipients.some(recipient => recipient.isManager);
  };

  const isFormValid = formData.name && 
    formData.symbol && 
    formData.description && 
    formData.imageUrl && 
    getTotalPercentage() <= 100 &&
    hasManagerAssigned() &&
    royaltyRecipients.every(recipient => recipient.role);

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <Header currentPath="/create" />

      {/* Main Content */}
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
              Create Your Token
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Launch your Solana token with automatic royalty routing, management delegation, and ownership marketplace features.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Token Image */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Token Image</h3>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-background-elevated rounded-lg p-8 text-center hover:border-primary-mint transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-primary font-medium mb-2">Upload Token Image</p>
                    <p className="text-text-secondary text-sm mb-2">PNG, JPG, or GIF up to 5MB</p>
                    <p className="text-text-secondary text-xs">Recommended: 512x512 pixels, square format</p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Token preview"
                    className="w-32 h-32 rounded-lg object-cover mx-auto"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Token Banner */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Token Banner</h3>
              
              {!bannerPreview ? (
                <div className="border-2 border-dashed border-background-elevated rounded-lg p-8 text-center hover:border-primary-mint transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                    id="banner-upload"
                  />
                  <label htmlFor="banner-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-primary font-medium mb-2">Upload Token Banner</p>
                    <p className="text-text-secondary text-sm mb-2">PNG, JPG, or GIF up to 5MB</p>
                    <p className="text-text-secondary text-xs">Recommended: 1500x500 pixels, landscape format</p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-32 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeBanner}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Token Details */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Token Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Token Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
                    Token Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., My Awesome Token"
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
                    required
                  />
                </div>

                {/* Token Symbol */}
                <div>
                  <label htmlFor="symbol" className="block text-sm font-medium text-text-primary mb-2">
                    Token Symbol *
                  </label>
                  <input
                    type="text"
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="e.g., MAT"
                    maxLength={10}
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent uppercase"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your token, its purpose, and what makes it unique..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent resize-none"
                  required
                />
              </div>
            </div>

            {/* Royalties */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Royalties</h3>
                <button
                  type="button"
                  onClick={addRoyaltyRecipient}
                  className="flex items-center space-x-2 px-3 py-1 bg-background-elevated text-text-primary rounded-lg hover:bg-background-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Recipient</span>
                </button>
              </div>
              
              <p className="text-text-secondary text-sm mb-6">
                Configure how royalties are distributed when your token is traded. You can keep 100% or share with other creators, influencers, or community members. You can also assign token management to any recipient - only one person can be the manager at a time.
              </p>
              
              {/* Total Percentage Display */}
              <div className="flex items-center justify-between mb-4 p-3 bg-background-dark rounded-lg border border-background-elevated">
                <span className="text-sm font-medium text-text-primary">Total Distribution:</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold ${
                    getTotalPercentage() > 100 
                      ? 'text-red-400' 
                      : getTotalPercentage() === 100 
                        ? 'text-primary-mint' 
                        : 'text-text-secondary'
                  }`}>
                    {getTotalPercentage()}%
                  </span>
                  {getTotalPercentage() > 100 && (
                    <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                      Exceeds 100%
                    </span>
                  )}
                  {getTotalPercentage() === 100 && (
                    <span className="text-xs text-primary-mint bg-primary-mint/10 px-2 py-1 rounded">
                      Perfect!
                    </span>
                  )}
                  {getTotalPercentage() < 100 && (
                    <span className="text-xs text-text-secondary bg-background-elevated px-2 py-1 rounded">
                      {100 - getTotalPercentage()}% remaining
                    </span>
                  )}
                </div>
              </div>



              <div className="space-y-4">
                {royaltyRecipients.map((recipient, index) => (
                  <div key={recipient.id} className="bg-background-dark rounded-lg p-4 border border-background-elevated">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-text-primary">
                          {index === 0 ? 'You (Creator)' : `Recipient ${index + 1}`}
                        </span>
                        {recipient.isManager && (
                          <span className="text-xs bg-primary-mint/20 text-primary-mint px-2 py-1 rounded-full">
                            Manager
                          </span>
                        )}
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeRoyaltyRecipient(recipient.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <span className="text-sm font-medium text-primary-mint">
                        {recipient.percentage}%
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="relative" ref={(el) => { dropdownRefs.current[`platform-${recipient.id}`] = el; }}>
                        <button
                          type="button"
                          onClick={() => setOpenDropdowns(prev => ({ ...prev, [`platform-${recipient.id}`]: !prev[`platform-${recipient.id}`] }))}
                          className="w-full px-3 py-2 pr-8 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-between"
                        >
                          <span>
                            {recipient.type === 'wallet' ? 'Wallet Address' : 
                             recipient.identifier.split(':')[0] || 'Select platform'}
                            {recipient.type === 'wallet' && recipient.identifier && (
                              <span className="text-text-secondary ml-2">
                                ({recipient.identifier.slice(0, 4)}...{recipient.identifier.slice(-4)})
                              </span>
                            )}
                          </span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        
                        {openDropdowns[`platform-${recipient.id}`] && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-background-elevated rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                            <div className="py-2">
                              <button
                                onClick={() => {
                                  updateRoyaltyRecipient(recipient.id, 'type', 'wallet');
                                  updateRoyaltyRecipient(recipient.id, 'identifier', '');
                                  setOpenDropdowns(prev => ({ ...prev, [`platform-${recipient.id}`]: false }));
                                }}
                                className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                              >
                                <Wallet className="w-4 h-4" />
                                <span className="text-sm">Wallet Address</span>
                              </button>
                              
                              {/* For creator, only show connected platforms */}
                              {index === 0 ? (
                                getUserSocialPlatforms().map(platform => (
                                  <button
                                    key={platform.platformKey}
                                    onClick={() => {
                                      if (platform.platformKey === 'wallet') {
                                        updateRoyaltyRecipient(recipient.id, 'type', 'wallet');
                                        updateRoyaltyRecipient(recipient.id, 'identifier', platform.handle);
                                      } else {
                                        updateRoyaltyRecipient(recipient.id, 'type', 'social');
                                        updateRoyaltyRecipient(recipient.id, 'identifier', platform.platformKey + ':@' + platform.handle);
                                      }
                                      setOpenDropdowns(prev => ({ ...prev, [`platform-${recipient.id}`]: false }));
                                    }}
                                    className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                                  >
                                    {platform.platformIcon}
                                    <span className="text-sm">{platform.platformName}</span>
                                    {platform.platformKey !== 'wallet' && (
                                      <span className="text-xs text-text-secondary ml-auto">@{platform.handle}</span>
                                    )}
                                    {platform.platformKey === 'wallet' && (
                                      <span className="text-xs text-text-secondary ml-auto">{platform.handle.slice(0, 4)}...{platform.handle.slice(-4)}</span>
                                    )}
                                  </button>
                                ))
                              ) : (
                                /* For other recipients, show all platforms */
                                SOCIAL_PLATFORMS.map(platform => (
                                  <button
                                    key={platform.key}
                                    onClick={() => {
                                      updateRoyaltyRecipient(recipient.id, 'type', 'social');
                                      updateRoyaltyRecipient(recipient.id, 'identifier', platform.key + ':');
                                      setOpenDropdowns(prev => ({ ...prev, [`platform-${recipient.id}`]: false }));
                                    }}
                                    className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                                  >
                                    {platform.icon}
                                    <span className="text-sm">{platform.name}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Display selected identifier for creator */}
                    {index === 0 && recipient.identifier && (
                      <div className="mb-3">
                        <div className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm flex items-center space-x-2">
                          <Wallet className="w-4 h-4 text-text-secondary" />
                          <span className="text-text-secondary">Selected:</span>
                          <span className="font-medium">
                            {recipient.type === 'wallet' 
                              ? `${recipient.identifier.slice(0, 4)}...${recipient.identifier.slice(-4)}`
                              : recipient.identifier
                            }
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {index > 0 && (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={recipient.type === 'wallet' ? recipient.identifier : recipient.identifier.split(':')[1] || ''}
                          onChange={(e) => {
                            if (recipient.type === 'wallet') {
                              updateRoyaltyRecipient(recipient.id, 'identifier', e.target.value);
                            } else {
                              const platform = recipient.identifier.split(':')[0] || 'X';
                              updateRoyaltyRecipient(recipient.id, 'identifier', platform + ':' + e.target.value);
                            }
                          }}
                          placeholder={recipient.type === 'wallet' ? 'Enter wallet address' : (() => {
                            const platform = recipient.identifier.split(':')[0];
                            if (platform === 'LinkedIn') return 'Enter profile URL (e.g., linkedin.com/in/username)';
                            if (platform === 'GitHub') return 'Enter profile URL (e.g., github.com/username)';
                            if (platform === 'YouTube') return 'Enter channel link (e.g., youtube.com/@channel)';
                            return 'Enter username (e.g., @username)';
                          })()}
                          className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint"
                        />
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <div className="relative" ref={(el) => { dropdownRefs.current[`role-${recipient.id}`] = el; }}>
                        <button
                          type="button"
                          onClick={() => setOpenDropdowns(prev => ({ ...prev, [`role-${recipient.id}`]: !prev[`role-${recipient.id}`] }))}
                          disabled={recipient.isManager}
                          className={`w-full px-3 py-2 pr-8 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-between ${
                            recipient.isManager ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <span>{recipient.role || 'Select role'}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        
                        {openDropdowns[`role-${recipient.id}`] && !recipient.isManager && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-background-elevated rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                            <div className="py-2">
                              {ROLES.map(role => (
                                <button
                                  key={role.key}
                                  onClick={() => {
                                    updateRoyaltyRecipient(recipient.id, 'role', role.key);
                                    setOpenDropdowns(prev => ({ ...prev, [`role-${recipient.id}`]: false }));
                                  }}
                                  className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                                >
                                  {role.icon}
                                  <span className="text-sm">{role.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="0"
                        max={100 - (getTotalPercentage() - recipient.percentage)}
                        value={recipient.percentage}
                        onChange={(e) => updateRoyaltyRecipient(recipient.id, 'percentage', parseInt(e.target.value))}
                        className="flex-1 h-2 bg-background-elevated rounded-lg appearance-none cursor-pointer slider focus:outline-none focus:ring-0"
                        style={{
                          background: 'var(--background-elevated)',
                          outline: 'none'
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        max={100 - (getTotalPercentage() - recipient.percentage)}
                        value={recipient.percentage}
                        onChange={(e) => updateRoyaltyRecipient(recipient.id, 'percentage', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 bg-background-elevated border border-background-elevated rounded text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-mint"
                      />
                    </div>
                    
                    {/* Management Toggle */}
                    <div className="mt-3 pt-3 border-t border-background-elevated">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-text-primary">Token Management</span>
                          <span className="text-xs text-text-secondary">(Controls token settings & updates)</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recipient.isManager}
                            onChange={(e) => {
                              updateRoyaltyRecipient(recipient.id, 'isManager', e.target.checked);
                              // Automatically set role to "Management" when manager is enabled
                              if (e.target.checked) {
                                updateRoyaltyRecipient(recipient.id, 'role', 'Management');
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-background-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-mint rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-mint"></div>
                        </label>
                      </div>
                      {recipient.isManager && (
                        <p className="text-xs text-primary-mint mt-1">
                          ✓ This recipient will have management control over the token
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              

            </div>

            {/* Social Links */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Social Links</h3>
              
              <div>
                <label htmlFor="twitterUrl" className="block text-sm font-medium text-text-primary mb-2">
                  Twitter/X URL (optional)
                </label>
                <input
                  type="url"
                  id="twitterUrl"
                  name="twitterUrl"
                  value={formData.twitterUrl}
                  onChange={handleInputChange}
                  placeholder="https://x.com/yourproject"
                  className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
                />
                <label htmlFor="telegramUrl" className="block text-sm font-medium text-text-primary mt-4 mb-2">
                  Telegram URL (optional)
                </label>
                <input
                  type="url"
                  id="telegramUrl"
                  name="telegramUrl"
                  value={formData.telegramUrl}
                  onChange={handleInputChange}
                  placeholder="https://t.me/yourproject"
                  className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
                />

              </div>
            </div>

            {/* Initial Buy */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Initial Buy</h3>
              
              <div>
                <label htmlFor="initialBuyAmount" className="block text-sm font-medium text-text-primary mb-2">
                  Initial Buy Amount (SOL)
                </label>
                <input
                  type="number"
                  id="initialBuyAmount"
                  name="initialBuyAmount"
                  value={formData.initialBuyAmount}
                  onChange={handleInputChange}
                  placeholder="0.01"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
                />
                <p className="text-xs text-text-secondary mt-2">
                  Amount of SOL to use for the initial token purchase
                </p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Cost Breakdown</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Launch Fee</span>
                  <span className="text-text-primary font-medium">0.1 SOL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Initial Buy</span>
                  <span className="text-text-primary font-medium">{formData.initialBuyAmount || '0'} SOL</span>
                </div>
                <div className="border-t border-background-elevated pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-primary font-semibold">Total Cost</span>
                    <span className="text-primary-mint font-bold text-lg">
                      {(0.1 + parseFloat(formData.initialBuyAmount || '0')).toFixed(3)} SOL
                    </span>
                  </div>
                </div>
                <div className="bg-background-dark rounded-lg p-3 mt-3">
                  <p className="text-xs text-text-secondary">
                    💡 <strong>Platform handles all network fees and transaction costs</strong>
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    You'll receive {formData.initialBuyAmount || '0'} SOL worth of tokens after launch
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting || !isConnected}
                className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-mint ${
                  isFormValid && !isSubmitting && isConnected
                    ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:opacity-90'
                    : 'bg-background-elevated text-text-secondary cursor-not-allowed'
                }`}
              >
                {!isConnected 
                  ? 'Connect Wallet' 
                  : isSubmitting 
                    ? 'Creating Token...' 
                    : 'Launch Token'
                }
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CreateCoin;
