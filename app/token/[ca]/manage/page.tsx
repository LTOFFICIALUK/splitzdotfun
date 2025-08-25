'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ExternalLink, Copy, CheckCircle, DollarSign, ChevronDown, MessageCircle, Users, Shield, Heart, Wallet, Video, Music, X, AlertTriangle, Plus } from 'lucide-react';
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
import { getOrCreateProfile } from '@/lib/supabase';

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

interface TokenManagementData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  tokenAddress: string;
  creatorWallet: string;
  totalSupply: number | null;
  circulatingSupply: number | null;
  holders: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  feesGenerated: number | null;
  royaltyRecipients: Array<{
    id: string;
    type: 'wallet' | 'social';
    identifier: string;
    percentage: number;
    label: string;
    earned: number;
    claimed: number;
    isManager: boolean;
    role: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: 'buy' | 'sell' | 'fee_collection';
    amount: number;
    timestamp: string;
    description: string;
  }>;
  socialLink: string | null;
  metadataUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isListed: boolean;
  marketplaceListing?: {
    id: string;
    listing_price: number;
    description: string | null;
    new_owner_fee_share: number;
    proposed_fee_splits: any[];
    created_at: string;
  };
}

interface TokenManagePageProps {
  params: {
    ca: string;
  };
}

const TokenManagePage: React.FC<TokenManagePageProps> = ({ params }) => {
  const { publicKey, isConnected } = useWallet();

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Claim fees for connected wallet
  const handleClaimFees = async () => {
    if (!isConnected || !publicKey || !tokenData?.id) {
      alert('Please connect your wallet first');
      return;
    }

    setIsProcessingPayout(true);

    try {
      const response = await fetch('/api/payout-royalties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_id: tokenData.id,
          earner_wallet: publicKey.toString(),
          claim_reason: 'Claim fees for connected wallet',
          claimer_user_id: userProfile?.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully claimed ${result.data.amount_sol} SOL! Transaction: ${result.data.transaction_signature}`);
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Network error occurred');
      console.error('Payout error:', error);
    } finally {
      setIsProcessingPayout(false);
    }
  };

  // Fee share management functions
  const handleUpdateRoyaltyShares = async () => {
    if (!tokenData?.id) return;

    setIsUpdatingShares(true);

    try {
      const response = await fetch('/api/update-royalty-shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_id: tokenData.id,
          platform_fee_bps: platformFeeBps,
          royalty_shares: editingShares,
          updated_by_user_id: userProfile?.id,
          reason: 'Updated via token management interface'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Royalty shares updated successfully!');
        setShowFeeShareModal(false);
        
        // Refresh royalty shares data
        const sharesResponse = await fetch(`/api/royalty-shares?token_id=${tokenData.id}`);
        if (sharesResponse.ok) {
          const sharesResult = await sharesResponse.json();
          if (sharesResult.success) {
            setRoyaltyShares(sharesResult.data);
          }
        }
      } else {
        alert(result.error || 'Failed to update royalty shares');
      }
    } catch (error) {
      alert('Network error occurred');
      console.error('Update royalty shares error:', error);
    } finally {
      setIsUpdatingShares(false);
    }
  };

  const addRoyaltyShare = () => {
    setEditingShares([...editingShares, {
      earner_wallet: '',
      bps: 0,
      percentage: 0
    }]);
  };

  const removeRoyaltyShare = (index: number) => {
    setEditingShares(editingShares.filter((_, i) => i !== index));
  };

  const updateRoyaltyShare = (index: number, field: string, value: string | number) => {
    const updated = [...editingShares];
    if (field === 'earner_wallet') {
      updated[index].earner_wallet = value as string;
    } else if (field === 'percentage') {
      const percentage = parseFloat(value as string) || 0;
      updated[index].percentage = percentage;
      updated[index].bps = Math.round(percentage * 100);
    }
    setEditingShares(updated);
  };

  const calculateTotalEarnerPercentage = () => {
    return editingShares.reduce((sum, share) => sum + share.percentage, 0);
  };

  const calculateTotalEarnerBps = () => {
    return editingShares.reduce((sum, share) => sum + share.bps, 0);
  };

  const getValidationError = () => {
    const totalEarnerBps = calculateTotalEarnerBps();
    const expectedEarnerBps = 10000 - platformFeeBps;
    
    if (totalEarnerBps !== expectedEarnerBps) {
      return `Total earner shares must equal ${expectedEarnerBps / 100}% (currently ${totalEarnerBps / 100}%)`;
    }
    
    if (editingShares.some(share => !share.earner_wallet.trim())) {
      return 'All earners must have a wallet address';
    }
    
    return null;
  };
  const [tokenData, setTokenData] = useState<TokenManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecipients, setEditingRecipients] = useState<Array<{
    id: string;
    label: string;
    role: string;
    percentage: number;
    social_or_wallet: string;
    type: 'wallet' | 'social';
  }>>([]);
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'management'>('overview');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingData, setListingData] = useState({
    price: '',
    newOwnerFeeShare: 0, // New owner's fee percentage
    newFeeSplits: [] as Array<{
      id: string;
      label: string;
      percentage: number;
      timeLock: number; // in days
      isRemoved: boolean;
      type?: 'wallet' | 'social';
      social_or_wallet?: string;
      showPlatformDropdown?: boolean;
    }>,
    description: ''
  });
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Payout system state
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  
  // Fee share management state
  const [royaltyShares, setRoyaltyShares] = useState<any>(null);
  const [showFeeShareModal, setShowFeeShareModal] = useState(false);
  const [isUpdatingShares, setIsUpdatingShares] = useState(false);
  const [editingShares, setEditingShares] = useState<Array<{
    earner_wallet: string;
    bps: number;
    percentage: number;
  }>>([]);
  const [platformFeeBps, setPlatformFeeBps] = useState(2000); // Default 20%

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoading(true);
        
        // Fetch token data from database
        const contractAddress = params.ca;
        const response = await fetch(`/api/token/${contractAddress}/manage`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch token data');
        }

        const result = await response.json();
        
        if (result.success) {
          setTokenData(result.data);
          
          // Fetch royalty shares data
          const sharesResponse = await fetch(`/api/royalty-shares?token_id=${result.data.id}`);
          if (sharesResponse.ok) {
            const sharesResult = await sharesResponse.json();
            if (sharesResult.success) {
              setRoyaltyShares(sharesResult.data);
              if (sharesResult.data.current_agreement) {
                setPlatformFeeBps(sharesResult.data.current_agreement.platform_fee_bps);
                setEditingShares(sharesResult.data.current_agreement.royalty_shares);
              }
            }
          }
        } else {
          throw new Error(result.error || 'Failed to fetch token data');
        }
      } catch (err) {
        setError('Failed to load token data');
        console.error('Error fetching token data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [params.ca]);

  // Fetch user profile when wallet is connected
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isConnected || !publicKey) {
        setUserProfile(null);
        return;
      }

      try {
        const profile = await getOrCreateProfile(publicKey);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching/creating user profile:', error);
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, [isConnected, publicKey]);



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach(key => {
        const ref = dropdownRefs.current[key];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdowns(prev => ({ ...prev, [key]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatMarketCap = (mcap: number | null) => {
    if (mcap === null || isNaN(mcap)) return 'NaN';
    if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(1)}B`;
    if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(1)}M`;
    if (mcap >= 1e3) return `$${(mcap / 1e3).toFixed(1)}K`;
    return `$${mcap.toFixed(0)}`;
  };

  const formatNumber = (num: number | null) => {
    if (num === null || isNaN(num)) return 'NaN';
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatChange = (change: number | null) => {
    if (change === null || isNaN(change)) return 'NaN';
    const isPositive = change >= 0;
    return `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
  };

  const handleSaveDistribution = async () => {
    // Validate that total percentage equals 100%
    if (getTotalPercentage() !== 100) {
      alert('Total distribution must equal 100%. Please adjust the percentages.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/token/${params.ca}/manage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          royaltyRecipients: editingRecipients
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update distribution');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh the token data
        const refreshResponse = await fetch(`/api/token/${params.ca}/manage`);
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
                            setTokenData(refreshResult.data);
      }
    }
    setIsEditing(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  } else {
        throw new Error(result.error || 'Failed to update distribution');
      }
    } catch (error) {
      console.error('Error updating distribution:', error);
      alert('Failed to update distribution. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalPercentage = () => {
    return editingRecipients.reduce((total, recipient) => total + recipient.percentage, 0);
  };

  const handleCreateListing = async () => {
    if (!tokenData) return;

    if (!isConnected || !publicKey) {
      alert('Please connect your wallet to create a listing.');
      return;
    }

    setIsCreatingListing(true);

    try {
      // Use the cached user profile
      if (!userProfile) {
        throw new Error('No profile found for your wallet address. Please ensure you have a profile created.');
      }
      
      const sellerUserId = userProfile.id;

      const response = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: tokenData.id, // You'll need to add this to your TokenManagementData interface
          listingPrice: parseFloat(listingData.price),
          description: listingData.description,
          newOwnerFeeShare: listingData.newOwnerFeeShare,
          newFeeSplits: listingData.newFeeSplits,
          sellerUserId: sellerUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create listing');
      }

      const result = await response.json();
      
      if (result.success) {
        setShowListingModal(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        
        // Refresh token data to show updated listing status
        const refreshResponse = await fetch(`/api/token/${params.ca}/manage`);
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            setTokenData(refreshResult.data);
          }
        }
      } else {
        throw new Error(result.error || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      alert(`Failed to create listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingListing(false);
    }
  };

  const handleEditClick = () => {
    if (!tokenData) return;
    // Initialize editing recipients with current data
    const currentRecipients = tokenData.royaltyRecipients.map(recipient => ({
      id: recipient.id,
      label: recipient.label,
      role: recipient.role,
      percentage: recipient.percentage,
      social_or_wallet: recipient.identifier,
      type: recipient.identifier.includes(':') ? 'social' : 'wallet' as 'wallet' | 'social'
    }));
    setEditingRecipients(currentRecipients);
    setIsEditing(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath="/projects" />
        <main className="flex-1 pt-24 pb-8 flex flex-col">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-mint"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath="/projects" />
        <main className="flex-1 pt-24 pb-8 flex flex-col">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
            <div className="text-center flex-1 flex items-center justify-center">
              <div>
                <h1 className="text-2xl font-bold text-text-primary mb-4">Token Not Found</h1>
                <p className="text-text-secondary">The token with address {formatAddress(params.ca)} could not be found.</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header currentPath="/projects" />
      
      {/* Main Content */}
      <main className="flex-1 pt-24 pb-8 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col w-full">
          {/* Back Button */}
          <div className="mb-6">
            <a
              href="/projects"
              className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </a>
          </div>

          {/* Token Header */}
          <div className="bg-background-card rounded-xl border border-background-elevated p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center flex-shrink-0">
                  <span className="text-background-dark font-bold text-2xl">{tokenData.symbol && tokenData.symbol !== 'NaN' ? tokenData.symbol.charAt(0) : 'T'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                    <span className="text-2xl sm:text-3xl font-bold text-text-primary truncate">${tokenData.symbol && tokenData.symbol !== 'NaN' ? tokenData.symbol : 'TEST'}</span>
                    <h1 className="text-lg sm:text-xl font-normal text-text-secondary truncate">{tokenData.name}</h1>
                  </div>
                  <p className="text-text-secondary font-mono truncate text-sm">{formatAddress(tokenData.tokenAddress)}</p>
                </div>
              </div>
              <div className="text-left lg:text-right lg:flex-shrink-0">
                <p className="text-xl sm:text-2xl font-bold text-text-primary">{formatMarketCap(tokenData.marketCap)}</p>
                <p className={`text-base sm:text-lg font-medium ${tokenData.priceChange24h !== null && !isNaN(tokenData.priceChange24h) && tokenData.priceChange24h >= 0 ? 'text-green-400' : tokenData.priceChange24h !== null && !isNaN(tokenData.priceChange24h) ? 'text-red-400' : 'text-text-secondary'}`}>
                  {formatChange(tokenData.priceChange24h)}
                </p>
                <div className="mt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button 
                    onClick={handleClaimFees}
                    disabled={isProcessingPayout}
                    className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-3 sm:px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayout ? 'Processing...' : 'Claim Your Fees'}
                  </button>
                  {tokenData.isListed ? (
                    <button 
                      onClick={() => {
                        // Navigate to the marketplace listing
                        window.location.href = `/marketplace/${tokenData.tokenAddress}`;
                      }}
                      className="bg-background-card border border-background-elevated text-text-primary px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-background-elevated transition-colors whitespace-nowrap text-sm sm:text-base"
                    >
                      View Your Listing
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        // Initialize listing data with current fee splits
                        // Only include current owner's share, mark the rest as "Buyer"
                        const currentOwnerSplits = tokenData.royaltyRecipients.map(recipient => ({
                          id: recipient.id,
                          label: recipient.label,
                          percentage: recipient.percentage,
                          timeLock: 0, // Default no time lock
                          isRemoved: false
                        }));
                        
                        // Calculate the total percentage of current recipients
                        const currentTotal = tokenData.royaltyRecipients.reduce((sum, recipient) => sum + recipient.percentage, 0);
                        
                        // The new owner gets the remaining percentage (100% - current total)
                        const newOwnerShare = 100 - currentTotal;
                        
                        setListingData({
                          price: '',
                          newOwnerFeeShare: newOwnerShare,
                          newFeeSplits: currentOwnerSplits,
                          description: ''
                        });
                        setShowListingModal(true);
                      }}
                      className="bg-background-card border border-background-elevated text-text-primary px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-background-elevated transition-colors whitespace-nowrap text-sm sm:text-base"
                    >
                      List on Marketplace
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-background-card rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'management'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Management
            </button>


          </div>

          {/* Tab Content Container - FIXED WIDTH */}
          <div className="bg-background-card rounded-xl border border-background-elevated p-6 flex-1 w-full">
            <div className="w-full">
              {activeTab === 'overview' && (
                <div className="w-full space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary mb-4">Token Overview</h2>
                  
                  {/* Key Stats */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-background-dark rounded-lg p-4">
                      <p className="text-text-secondary text-sm mb-1">Total Supply</p>
                      <p className="text-lg font-semibold text-text-primary">{formatNumber(tokenData.totalSupply)}</p>
                    </div>
                    <div className="bg-background-dark rounded-lg p-4">
                      <p className="text-text-secondary text-sm mb-1">24h Volume</p>
                      <p className="text-lg font-semibold text-text-primary">{formatNumber(tokenData.circulatingSupply)}</p>
                    </div>
                    <div className="bg-background-dark rounded-lg p-4">
                      <p className="text-text-secondary text-sm mb-1">Holders</p>
                      <p className="text-lg font-semibold text-text-primary">{formatNumber(tokenData.holders)}</p>
                    </div>
                    <div className="bg-background-dark rounded-lg p-4">
                      <p className="text-text-secondary text-sm mb-1">Fees Generated</p>
                      <p className="text-lg font-semibold text-text-primary">{tokenData.feesGenerated === null || isNaN(tokenData.feesGenerated) ? 'NaN' : `${tokenData.feesGenerated.toFixed(1)} SOL`}</p>
                    </div>
                  </div>

                  {/* Fee Share Management */}
                  <div className="w-full bg-background-dark rounded-lg p-6 border border-background-elevated">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-text-primary">Fee Share Management</h3>
                      <button
                        onClick={() => setShowFeeShareModal(true)}
                        className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                      >
                        Manage Fee Shares
                      </button>
                    </div>

                    {royaltyShares?.current_agreement ? (
                      <div className="space-y-4">
                        {/* Platform Fee */}
                        <div className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
                          <div>
                            <p className="text-text-primary font-medium">Platform Fee</p>
                            <p className="text-text-secondary text-sm">Splitz takes this percentage</p>
                          </div>
                          <div className="text-right">
                            <p className="text-text-primary font-semibold">{royaltyShares.current_agreement.platform_fee_percentage}%</p>
                            <p className="text-text-secondary text-xs">Effective {formatDate(royaltyShares.current_agreement.effective_from)}</p>
                          </div>
                        </div>

                        {/* Royalty Earners */}
                        <div className="space-y-2">
                          <p className="text-text-primary font-medium">Royalty Earners</p>
                          {royaltyShares.current_agreement.royalty_shares.map((share: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
                              <div>
                                <p className="text-text-primary font-medium">{formatAddress(share.earner_wallet)}</p>
                                <p className="text-text-secondary text-xs">Earner {index + 1}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-text-primary font-semibold">{share.percentage}%</p>
                                <p className="text-text-secondary text-xs">{share.bps} bps</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Historical Versions */}
                        {royaltyShares.historical_versions && royaltyShares.historical_versions.length > 1 && (
                          <div className="mt-4">
                            <p className="text-text-primary font-medium mb-2">Version History</p>
                            <div className="space-y-2">
                              {royaltyShares.historical_versions.slice(1).map((version: any, index: number) => (
                                <div key={version.id} className="p-3 bg-background-elevated rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-text-secondary text-sm">Version {royaltyShares.historical_versions.length - index - 1}</p>
                                    <p className="text-text-secondary text-xs">
                                      {formatDate(version.effective_from)} - {version.effective_to ? formatDate(version.effective_to) : 'Active'}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-text-secondary text-xs">Platform: {version.platform_fee_percentage}%</p>
                                    <p className="text-text-secondary text-xs">{version.royalty_shares.length} earners</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-text-secondary mb-2">No fee share agreement found</p>
                        <button
                          onClick={() => setShowFeeShareModal(true)}
                          className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                          Set Up Fee Shares
                        </button>
                      </div>
                    )}
                  </div>




                </div>
              )}

                              {activeTab === 'management' && (
                <div className="w-full space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary mb-4">Royalty Distribution</h2>
                  
                  {!isEditing ? (
                    <>
                      {/* Current Distribution View */}
                      <div className="w-full">
                        <div className="w-full flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-text-primary">Current Distribution</h3>
                          <button 
                            onClick={handleEditClick}
                            className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                          >
                            Edit Distribution
                          </button>
                        </div>
                        <div className="w-full space-y-3">
                          {tokenData.royaltyRecipients.map((recipient) => (
                            <div key={recipient.id} className="w-full flex items-center justify-between bg-background-dark rounded-lg p-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-text-primary font-medium truncate">{recipient.label}</p>
                                  {recipient.isManager && (
                                    <span className="text-xs bg-primary-mint/20 text-primary-mint px-2 py-1 rounded-full flex-shrink-0">
                                      Manager
                                    </span>
                                  )}
                                </div>
                                <p className="text-text-secondary text-xs truncate">{recipient.role}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-3">
                                <p className="text-text-primary font-semibold">{isNaN(recipient.percentage) ? 'NaN' : `${recipient.percentage}%`}</p>
                                <p className="text-text-secondary text-xs">{isNaN(recipient.earned) ? 'NaN' : `${recipient.earned.toFixed(2)} SOL earned`}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fee Claims */}
                      <div className="w-full">
                        <h3 className="text-lg font-semibold text-text-primary mb-3">Fee Claims</h3>
                        <div className="w-full space-y-3">
                          {tokenData.royaltyRecipients.map((recipient) => (
                            <div key={recipient.id} className="w-full flex items-center justify-between bg-background-dark rounded-lg p-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-text-primary font-medium truncate">{recipient.label}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-3">
                                <p className="text-text-primary text-sm font-medium">{isNaN(recipient.claimed) ? 'NaN' : `${recipient.claimed.toFixed(2)} SOL claimed`}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Edit Distribution Form */}
                      <div className="w-full">
                        <div className="w-full flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-text-primary">Edit Distribution</h3>
                          <button 
                            onClick={() => setIsEditing(false)}
                            className="text-text-secondary hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                        
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
                        
                        <div className="w-full space-y-4">
                          {editingRecipients.map((recipient, index) => (
                            <div key={recipient.id} className="bg-background-dark rounded-lg p-4 border border-background-elevated">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-medium text-text-primary">
                                    Recipient {index + 1}
                                  </span>
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newRecipients = editingRecipients.filter((_, i) => i !== index);
                                        setEditingRecipients(newRecipients);
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-primary-mint">
                                  {recipient.percentage}%
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                  <label className="block text-sm font-medium text-text-primary mb-1">Platform</label>
                                  <div className="relative" ref={(el) => { dropdownRefs.current[`platform-${recipient.id}`] = el; }}>
                                    <button
                                      type="button"
                                      onClick={() => setOpenDropdowns(prev => ({ ...prev, [`platform-${recipient.id}`]: !prev[`platform-${recipient.id}`] }))}
                                      className="w-full px-3 py-2 pr-8 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-between"
                                    >
                                      <span>
                                        {recipient.type === 'wallet' ? 'Wallet Address' : 
                                         recipient.social_or_wallet.split(':')[0] || 'Select platform'}
                                      </span>
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                    
                                    {openDropdowns[`platform-${recipient.id}`] && (
                                      <div className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-background-elevated rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                        <div className="py-2">
                                          <button
                                            onClick={() => {
                                              const newRecipients = [...editingRecipients];
                                              newRecipients[index].type = 'wallet';
                                              newRecipients[index].social_or_wallet = '';
                                              setOpenDropdowns(prev => ({ ...prev, [`platform-${recipient.id}`]: false }));
                                            }}
                                            className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                                          >
                                            <Wallet className="w-4 h-4" />
                                            <span className="text-sm">Wallet Address</span>
                                          </button>
                                          
                                          {SOCIAL_PLATFORMS.map(platform => (
                                            <button
                                              key={platform.key}
                                              onClick={() => {
                                                const newRecipients = [...editingRecipients];
                                                newRecipients[index].type = 'social';
                                                newRecipients[index].social_or_wallet = platform.key + ':';
                                                setOpenDropdowns(prev => ({ ...prev, [`platform-${recipient.id}`]: false }));
                                              }}
                                              className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                                            >
                                              {platform.icon}
                                              <span className="text-sm">{platform.name}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Input field for wallet address or social handle */}
                                  <div className="mt-3">
                                    <input
                                      type="text"
                                      value={recipient.type === 'wallet' ? recipient.social_or_wallet : recipient.social_or_wallet.split(':')[1] || ''}
                                      onChange={(e) => {
                                        const newRecipients = [...editingRecipients];
                                        if (recipient.type === 'wallet') {
                                          newRecipients[index].social_or_wallet = e.target.value;
                                          newRecipients[index].label = e.target.value;
                                        } else {
                                          const platform = recipient.social_or_wallet.split(':')[0] || 'X';
                                          newRecipients[index].social_or_wallet = platform + ':' + e.target.value;
                                          newRecipients[index].label = platform + ':' + e.target.value;
                                        }
                                        setEditingRecipients(newRecipients);
                                      }}
                                      placeholder={recipient.type === 'wallet' ? 'Enter wallet address' : (() => {
                                        const platform = recipient.social_or_wallet.split(':')[0];
                                        if (platform === 'LinkedIn') return 'Link (https://linkedin.com/in/username)';
                                        if (platform === 'GitHub') return 'Link (https://github.com/username)';
                                        if (platform === 'YouTube') return 'Link (https://youtube.com/@channel)';
                                        if (platform === 'X') return '@username';
                                        if (platform === 'Instagram') return '@username';
                                        if (platform === 'TikTok') return '@username';
                                        if (platform === 'Twitch') return '@username';
                                        if (platform === 'Kick') return '@username';
                                        if (platform === 'Rumble') return '@username';
                                        if (platform === 'Instagram Threads') return '@username';
                                        return '@username';
                                      })()}
                                      className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-text-primary mb-1">Role</label>
                                  <div className="relative" ref={(el) => { dropdownRefs.current[`role-${recipient.id}`] = el; }}>
                                    <button
                                      type="button"
                                      onClick={() => setOpenDropdowns(prev => ({ ...prev, [`role-${recipient.id}`]: !prev[`role-${recipient.id}`] }))}
                                      className="w-full px-3 py-2 pr-8 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-between"
                                    >
                                      <span>{recipient.role || 'Choose Role'}</span>
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                    
                                    {openDropdowns[`role-${recipient.id}`] && (
                                      <div className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-background-elevated rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                        <div className="py-2">
                                          {ROLES.map(role => (
                                            <button
                                              key={role.key}
                                              onClick={() => {
                                                const newRecipients = [...editingRecipients];
                                                newRecipients[index].role = role.key;
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
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <input
                                  type="range"
                                  min="0"
                                  max={100 - (getTotalPercentage() - recipient.percentage)}
                                  value={recipient.percentage}
                                  onChange={(e) => {
                                    const newRecipients = [...editingRecipients];
                                    const newValue = parseInt(e.target.value) || 0;
                                    // Ensure the new total doesn't exceed 100%
                                    const currentTotal = getTotalPercentage();
                                    const currentRecipientPercentage = recipient.percentage;
                                    const newTotal = currentTotal - currentRecipientPercentage + newValue;
                                    
                                    if (newTotal <= 100) {
                                      newRecipients[index].percentage = newValue;
                                      setEditingRecipients(newRecipients);
                                    }
                                  }}
                                  className="flex-1 h-2 bg-background-elevated rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0"
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
                                  onChange={(e) => {
                                    const newRecipients = [...editingRecipients];
                                    const newValue = parseInt(e.target.value) || 0;
                                    // Ensure the new total doesn't exceed 100%
                                    const currentTotal = getTotalPercentage();
                                    const currentRecipientPercentage = recipient.percentage;
                                    const newTotal = currentTotal - currentRecipientPercentage + newValue;
                                    
                                    if (newTotal <= 100) {
                                      newRecipients[index].percentage = newValue;
                                      setEditingRecipients(newRecipients);
                                    }
                                  }}
                                  className="w-16 px-2 py-1 bg-background-elevated border border-background-elevated rounded text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-mint"
                                />
                              </div>
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => {
                              const newRecipient = {
                                id: Date.now().toString(),
                                label: '',
                                role: '',
                                percentage: 0,
                                social_or_wallet: '',
                                type: 'wallet' as 'wallet' | 'social'
                              };
                              setEditingRecipients([...editingRecipients, newRecipient]);
                            }}
                            className="w-full py-3 border-2 border-dashed border-background-elevated rounded-lg text-text-secondary hover:text-text-primary hover:border-primary-mint transition-colors"
                          >
                            + Add Recipient
                          </button>
                          
                          <div className="flex space-x-3 mt-6">
                            <button
                              onClick={() => setIsEditing(false)}
                              className="flex-1 bg-background-elevated text-text-primary px-4 py-2 rounded-lg font-medium hover:bg-background-dark transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveDistribution}
                              disabled={getTotalPercentage() !== 100 || isSaving}
                              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-opacity flex items-center justify-center space-x-2 ${
                                getTotalPercentage() === 100 && !isSaving
                                  ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:opacity-90'
                                  : 'bg-background-elevated text-text-secondary cursor-not-allowed opacity-50'
                              }`}
                            >
                              {isSaving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background-dark"></div>
                                  <span>Saving...</span>
                                </>
                              ) : (
                                'Save Changes'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}




            </div>
          </div>
        </div>
      </main>



      {/* Listing Modal */}
      {showListingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card rounded-xl border border-background-elevated max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">List Management on Marketplace</h2>
                <button
                  onClick={() => setShowListingModal(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Warning Section */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-yellow-500 mb-2">Management Transfer Warning</h3>
                      <p className="text-text-secondary text-sm">
                        By listing this token, you are proposing to transfer management control to a new owner. 
                        The new owner will have full control over fee distributions and token management. 
                        You will retain your fee share based on the time locks you set below.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Listing Price */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Listing Price (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={listingData.price}
                    onChange={(e) => setListingData({...listingData, price: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-mint"
                  />
                </div>

                {/* New Owner Fee Share */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    New Owner Fee Share (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={listingData.newOwnerFeeShare}
                    onChange={(e) => setListingData({...listingData, newOwnerFeeShare: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-mint"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Listing Description
                  </label>
                  <textarea
                    value={listingData.description}
                    onChange={(e) => setListingData({...listingData, description: e.target.value})}
                    placeholder="Describe why someone should buy this management position..."
                    rows={3}
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-mint resize-none"
                  />
                </div>

                {/* Fee Split Management */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Fee Split Proposal</h3>
                  <p className="text-text-secondary text-sm mb-4">
                    Configure the new fee distribution and time locks for current recipients. 
                    Set time locks to continue earning fees after management transfer.
                  </p>

                  <div className="space-y-4">
                    {listingData.newFeeSplits.map((split, index) => (
                      <div key={split.id} className="bg-background-dark rounded-lg p-4 border border-background-elevated">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={!split.isRemoved}
                              onChange={(e) => {
                                const newSplits = [...listingData.newFeeSplits];
                                newSplits[index].isRemoved = !e.target.checked;
                                setListingData({...listingData, newFeeSplits: newSplits});
                              }}
                              className="w-4 h-4 text-primary-mint bg-background-elevated border-background-elevated rounded focus:ring-primary-mint"
                            />
                            <span className={`font-medium ${split.isRemoved ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                              {split.label || 'New Recipient'}
                            </span>
                          </div>
                          {!split.isRemoved && (
                            <span className="text-sm text-text-secondary">
                              Current: {split.percentage}%
                            </span>
                          )}
                        </div>

                        {!split.isRemoved && (
                          <div className="space-y-4">
                            {/* Platform/Type Selection for New Recipients */}
                            {!split.label && (
                              <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                  Recipient Type
                                </label>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSplits = [...listingData.newFeeSplits];
                                      newSplits[index].showPlatformDropdown = !newSplits[index].showPlatformDropdown;
                                      setListingData({...listingData, newFeeSplits: newSplits});
                                    }}
                                    className="w-full px-3 py-2 pr-8 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-between"
                                  >
                                    <span>{split.type === 'wallet' ? 'Wallet Address' : (split.social_or_wallet?.split(':')[0] || 'Select platform')}</span>
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                  
                                  {split.showPlatformDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-background-elevated rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                      <div className="py-2">
                                        <button
                                          onClick={() => {
                                            const newSplits = [...listingData.newFeeSplits];
                                            newSplits[index].type = 'wallet';
                                            newSplits[index].social_or_wallet = '';
                                            newSplits[index].showPlatformDropdown = false;
                                            setListingData({...listingData, newFeeSplits: newSplits});
                                          }}
                                          className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                                        >
                                          <Wallet className="w-4 h-4" />
                                          <span className="text-sm">Wallet Address</span>
                                        </button>
                                        
                                        {SOCIAL_PLATFORMS.map(platform => (
                                          <button
                                            key={platform.key}
                                            onClick={() => {
                                              const newSplits = [...listingData.newFeeSplits];
                                              newSplits[index].type = 'social';
                                              newSplits[index].social_or_wallet = platform.key + ':';
                                              newSplits[index].showPlatformDropdown = false;
                                              setListingData({...listingData, newFeeSplits: newSplits});
                                            }}
                                            className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3"
                                          >
                                            {platform.icon}
                                            <span className="text-sm">{platform.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Input field for wallet address or social handle */}
                                <div className="mt-3">
                                  <input
                                    type="text"
                                    value={split.type === 'wallet' ? split.social_or_wallet || '' : split.social_or_wallet?.split(':')[1] || ''}
                                    onChange={(e) => {
                                      const newSplits = [...listingData.newFeeSplits];
                                      if (split.type === 'wallet') {
                                        newSplits[index].social_or_wallet = e.target.value;
                                        newSplits[index].label = e.target.value;
                                      } else {
                                        const platform = split.social_or_wallet?.split(':')[0] || 'X';
                                        newSplits[index].social_or_wallet = platform + ':' + e.target.value;
                                        newSplits[index].label = platform + ':' + e.target.value;
                                      }
                                      setListingData({...listingData, newFeeSplits: newSplits});
                                    }}
                                                                          placeholder={split.type === 'wallet' ? 'Enter wallet address' : (() => {
                                        const platform = split.social_or_wallet?.split(':')[0];
                                      if (platform === 'LinkedIn') return 'Link (https://linkedin.com/in/username)';
                                      if (platform === 'GitHub') return 'Link (https://github.com/username)';
                                      if (platform === 'YouTube') return 'Link (https://youtube.com/@channel)';
                                      if (platform === 'X') return '@username';
                                      if (platform === 'Instagram') return '@username';
                                      if (platform === 'TikTok') return '@username';
                                      if (platform === 'Twitch') return '@username';
                                      if (platform === 'Kick') return '@username';
                                      if (platform === 'Rumble') return '@username';
                                      if (platform === 'Instagram Threads') return '@username';
                                      return '@username';
                                    })()}
                                    className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                  New Percentage
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={split.percentage}
                                  onChange={(e) => {
                                    const newSplits = [...listingData.newFeeSplits];
                                    newSplits[index].percentage = parseInt(e.target.value) || 0;
                                    setListingData({...listingData, newFeeSplits: newSplits});
                                  }}
                                  className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                  Time Lock (days)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={split.timeLock}
                                  onChange={(e) => {
                                    const newSplits = [...listingData.newFeeSplits];
                                    newSplits[index].timeLock = parseInt(e.target.value) || 0;
                                    setListingData({...listingData, newFeeSplits: newSplits});
                                  }}
                                  placeholder="0 = no lock"
                                  className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add New Recipient Button */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const newSplit = {
                          id: Date.now().toString(),
                          label: '',
                          percentage: 0,
                          timeLock: 0,
                          isRemoved: false,
                          type: 'wallet' as 'wallet' | 'social',
                          social_or_wallet: ''
                        };
                        setListingData(prev => ({
                          ...prev,
                          newFeeSplits: [...prev.newFeeSplits, newSplit]
                        }));
                      }}
                      className="w-full py-3 border-2 border-dashed border-background-elevated rounded-lg text-text-secondary hover:text-text-primary hover:border-primary-mint transition-colors flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Recipient</span>
                    </button>
                  </div>

                  {/* Total Percentage Display */}
                  <div className="mt-4 p-3 bg-background-dark rounded-lg border border-background-elevated">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">Current Recipients:</span>
                        <span className="text-sm text-text-primary">
                          {listingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">New Owner Share:</span>
                        <span className="text-sm text-blue-400">
                          {listingData.newOwnerFeeShare}%
                        </span>
                      </div>
                      <div className="border-t border-background-elevated pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">Total Percentage:</span>
                          <span className={`text-sm font-bold ${
                            (listingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + listingData.newOwnerFeeShare) === 100 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {(listingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + listingData.newOwnerFeeShare)}%
                          </span>
                        </div>
                        {(listingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + listingData.newOwnerFeeShare) !== 100 && (
                          <p className="text-xs text-red-400 mt-1">
                            Total must equal 100% for a valid listing
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-background-elevated">
                  <button
                    onClick={() => setShowListingModal(false)}
                    className="flex-1 bg-background-elevated text-text-primary px-4 py-3 rounded-lg font-medium hover:bg-background-dark transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateListing}
                    disabled={
                      !listingData.price || 
                      parseFloat(listingData.price) <= 0 ||
                      (listingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + listingData.newOwnerFeeShare) !== 100 ||
                      isCreatingListing
                    }
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-opacity flex items-center justify-center space-x-2 ${
                      listingData.price && 
                      parseFloat(listingData.price) > 0 &&
                      (listingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + listingData.newOwnerFeeShare) === 100 &&
                      !isCreatingListing
                        ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:opacity-90'
                        : 'bg-background-elevated text-text-secondary cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isCreatingListing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background-dark"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      'Create Listing'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Share Management Modal */}
      {showFeeShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card rounded-xl border border-background-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Manage Fee Shares</h2>
                <button
                  onClick={() => setShowFeeShareModal(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Platform Fee */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Platform Fee (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={platformFeeBps / 100}
                    onChange={(e) => setPlatformFeeBps(Math.round((parseFloat(e.target.value) || 0) * 100))}
                    className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint"
                    placeholder="20"
                  />
                  <p className="text-text-secondary text-xs mt-1">Splitz takes this percentage of fees</p>
                </div>

                {/* Royalty Earners */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-text-primary">Royalty Earners</label>
                    <button
                      onClick={addRoyaltyShare}
                      className="text-primary-mint hover:text-primary-aqua transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingShares.map((share, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-background-elevated rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={share.earner_wallet}
                            onChange={(e) => updateRoyaltyShare(index, 'earner_wallet', e.target.value)}
                            placeholder="Wallet address"
                            className="w-full px-3 py-2 bg-background-dark border border-background-elevated rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={share.percentage}
                            onChange={(e) => updateRoyaltyShare(index, 'percentage', e.target.value)}
                            placeholder="%"
                            className="w-full px-3 py-2 bg-background-dark border border-background-elevated rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint"
                          />
                        </div>
                        <button
                          onClick={() => removeRoyaltyShare(index)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation */}
                {getValidationError() && (
                  <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                    <p className="text-red-400 text-sm">{getValidationError()}</p>
                  </div>
                )}

                {/* Summary */}
                <div className="p-4 bg-background-dark rounded-lg border border-background-elevated">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-secondary">Platform Fee:</span>
                      <span className="text-sm text-text-primary">{platformFeeBps / 100}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-secondary">Earner Shares:</span>
                      <span className="text-sm text-text-primary">{calculateTotalEarnerPercentage()}%</span>
                    </div>
                    <div className="border-t border-background-elevated pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">Total:</span>
                        <span className={`text-sm font-bold ${
                          (platformFeeBps / 100 + calculateTotalEarnerPercentage()) === 100 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {(platformFeeBps / 100 + calculateTotalEarnerPercentage()).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-6 border-t border-background-elevated">
                <button
                  onClick={() => setShowFeeShareModal(false)}
                  className="flex-1 bg-background-elevated text-text-primary px-4 py-3 rounded-lg font-medium hover:bg-background-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRoyaltyShares}
                  disabled={!!getValidationError() || isUpdatingShares}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-opacity flex items-center justify-center space-x-2 ${
                    !getValidationError() && !isUpdatingShares
                      ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:opacity-90'
                      : 'bg-background-elevated text-text-secondary cursor-not-allowed opacity-50'
                  }`}
                >
                  {isUpdatingShares ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background-dark"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update Fee Shares'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-6 py-3 rounded-lg shadow-lg border border-background-elevated flex items-center space-x-2 animate-in slide-in-from-right duration-300">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Listing created successfully!</span>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default TokenManagePage;
