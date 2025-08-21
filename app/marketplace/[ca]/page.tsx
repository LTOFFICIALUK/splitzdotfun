'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { useWallet } from '@/components/ui/WalletProvider';
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
import { 
  ArrowLeft, 
  ShoppingCart, 
  User, 
  Clock, 
  ExternalLink, 
  Shield, 
  TrendingUp,
  Calendar,
  DollarSign,
  Percent,
  Settings,
  X,
  AlertTriangle,
  Plus,
  ChevronDown,
  Wallet,
  MessageCircle,
  CheckCircle
} from 'lucide-react';

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

interface MarketplaceListing {
  id: string;
  tokenName: string;
  tokenTicker: string;
  tokenAddress: string;
  ownershipPercentage: number;
  price: number;
  currency: 'SOL' | 'USD';
  description: string;
  seller: string;
  imageUrl: string;
  createdAt: string;
  tokenId: string;
  sellerUserId: string;
  newOwnerFeeShare: number;
  proposedFeeSplits: any[];
  isActive: boolean;
  isSold: boolean;
  profiles: {
    id: string;
    wallet_address: string;
    username: string | null;
    bio: string | null;
    profile_image_url: string | null;
    social_links: any[];
  };
}

interface DatabaseListing {
  id: string;
  token_id: string;
  seller_user_id: string;
  listing_price: number;
  description: string | null;
  new_owner_fee_share: number;
  proposed_fee_splits: any[];
  is_active: boolean;
  is_sold: boolean;
  created_at: string;
  tokens: {
    id: string;
    name: string;
    symbol: string;
    contract_address: string;
    image_url: string | null;
  };
  profiles: {
    id: string;
    wallet_address: string;
    username: string | null;
    bio: string | null;
    profile_image_url: string | null;
    social_links: any[];
  };
}

export default function MarketplaceListingDetailPage() {
  const params = useParams();
  const contractAddress = params.ca as string;
  const { publicKey, isConnected } = useWallet();
  
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [isRemovingListing, setIsRemovingListing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editListingData, setEditListingData] = useState({
    price: '',
    newOwnerFeeShare: 0,
    newFeeSplits: [] as Array<{
      id: string;
      label: string;
      percentage: number;
      timeLock: number;
      isRemoved: boolean;
      type?: 'wallet' | 'social';
      social_or_wallet?: string;
      showPlatformDropdown?: boolean;
    }>,
    description: ''
  });

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/marketplace/listings/ca/${contractAddress}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch listing details');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          const dbListing: DatabaseListing = result.data;
          
          console.log('Raw API response:', result.data);
          console.log('Profiles data:', result.data.profiles);
          
          // Validate that profiles data exists
          if (!result.data.profiles) {
            console.error('No profiles data found in API response');
            throw new Error('Seller information not available');
          }
          
          // Transform database listing to marketplace format
          const transformedListing: MarketplaceListing = {
            id: dbListing.id,
            tokenName: dbListing.tokens.name || 'Unknown Token',
            tokenTicker: dbListing.tokens.symbol || 'UNKNOWN',
            tokenAddress: dbListing.tokens.contract_address,
            ownershipPercentage: dbListing.new_owner_fee_share,
            price: dbListing.listing_price,
            currency: 'SOL' as const,
            description: dbListing.description || 'No description provided',
            seller: dbListing.profiles?.username || (dbListing.profiles?.wallet_address ? dbListing.profiles.wallet_address.slice(0, 8) + '...' : 'Unknown Seller'),
            imageUrl: dbListing.tokens.image_url || '/images/placeholder-token.png',
            createdAt: dbListing.created_at,
            tokenId: dbListing.token_id,
            sellerUserId: dbListing.seller_user_id,
            newOwnerFeeShare: dbListing.new_owner_fee_share,
            proposedFeeSplits: dbListing.proposed_fee_splits,
            isActive: dbListing.is_active,
            isSold: dbListing.is_sold,
            profiles: dbListing.profiles,
          };

          console.log('Transformed listing:', transformedListing);
          console.log('Seller information in transformed listing:', {
            seller: transformedListing.seller,
            profiles: transformedListing.profiles
          });
          setListing(transformedListing);
        } else {
          throw new Error(result.error || 'Listing not found');
        }
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch listing details');
      } finally {
        setLoading(false);
      }
    };

    if (contractAddress) {
      fetchListingDetails();
    }
  }, [contractAddress]);

  const handleBuyNow = () => {
    if (listing) {
      alert(`Buying ${listing.ownershipPercentage}% of ${listing.tokenName} for ${listing.price} ${listing.currency}... (This is a stub)`);
    }
  };

  const handleContactSeller = () => {
    if (listing) {
      alert(`Contacting seller ${listing.seller}... (This is a stub)`);
    }
  };

  const handleEditListing = () => {
    if (listing) {
      // Populate the edit form with current listing data
      setEditListingData({
        price: listing.price.toString(),
        newOwnerFeeShare: listing.newOwnerFeeShare,
        newFeeSplits: listing.proposedFeeSplits.map(split => ({
          id: split.id || Math.random().toString(),
          label: split.label,
          percentage: split.percentage,
          timeLock: split.timeLock || 0,
          isRemoved: false
        })),
        description: listing.description
      });
      setShowEditModal(true);
    }
  };

  const handleRemoveListing = () => {
    setShowRemoveConfirmModal(true);
  };

  const handleConfirmRemoveListing = async () => {
    if (!listing) return;

    setIsRemovingListing(true);

    try {
      const response = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove listing');
      }

      const result = await response.json();
      
      if (result.success) {
        setShowRemoveConfirmModal(false);
        setSuccessMessage('Listing removed successfully!');
        setShowSuccessMessage(true);
        
        // Hide the success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
        
        // Redirect to token management page
        if (result.tokenAddress) {
          setTimeout(() => {
            window.location.href = `/token/${result.tokenAddress}/manage`;
          }, 1500);
        }
      } else {
        throw new Error(result.error || 'Failed to remove listing');
      }
    } catch (error) {
      console.error('Error removing listing:', error);
      alert(`Failed to remove listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRemovingListing(false);
    }
  };

  const handleUpdateListing = async () => {
    if (!listing) return;

    setIsUpdatingListing(true);

    try {
      const response = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingPrice: parseFloat(editListingData.price),
          description: editListingData.description,
          newOwnerFeeShare: editListingData.newOwnerFeeShare,
          newFeeSplits: editListingData.newFeeSplits
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update listing');
      }

      const result = await response.json();
      
      if (result.success) {
        setShowEditModal(false);
        // Refresh the listing data
        const refreshResponse = await fetch(`/api/marketplace/listings/ca/${contractAddress}`);
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            setListing(refreshResult.data);
          }
        }
        alert('Listing updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      alert(`Failed to update listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingListing(false);
    }
  };

  // Check if the current user is the seller
  const isCurrentUserSeller = isConnected && publicKey && listing?.profiles?.wallet_address === publicKey;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath="/marketplace" />
        <main className="pt-16 flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-mint mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading listing details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath="/marketplace" />
        <main className="pt-16 flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Token Listing Not Found</h3>
              <p className="text-text-secondary mb-4">{error || 'The requested token listing could not be found.'}</p>
              <Link href="/marketplace">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header currentPath="/marketplace" />
      
      <main className="pt-16 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link href="/marketplace" className="inline-flex items-center text-text-secondary hover:text-text-primary mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Left Column - Main Details */}
            <div className="xl:col-span-3">
              {/* Token Header */}
              <div className="bg-background-card rounded-2xl border border-background-elevated p-6 mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center flex-shrink-0">
                      <span className="text-background-dark font-bold text-2xl">{listing.tokenTicker.charAt(0)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-3xl font-bold text-text-primary truncate">{listing.tokenName}</h1>
                      <p className="text-text-secondary font-mono text-sm truncate">{listing.tokenTicker}</p>
                      <p className="text-text-secondary font-mono text-xs truncate">
                        {listing.tokenAddress.slice(0, 8)}...{listing.tokenAddress.slice(-8)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="text-3xl font-bold text-primary-mint">
                      {listing.price} {listing.currency}
                    </div>
                    <div className="text-text-secondary text-sm">
                      {listing.ownershipPercentage}% ownership
                    </div>
                    <div className="text-text-secondary text-xs mt-1">
                      Listed {formatDate(listing.createdAt)}
                    </div>
                  </div>
                </div>

                {listing.description && (
                  <p className="text-text-primary text-lg leading-relaxed">
                    {listing.description}
                  </p>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-background-elevated">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Listed {formatDate(listing.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(listing.createdAt).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}</span>
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary">
                    Listing ID: {listing.id.slice(0, 8)}...
                  </div>
                </div>
              </div>

              {/* Token Stats */}
              <div className="bg-background-card rounded-2xl border border-background-elevated p-6 mb-6">
                <h3 className="text-xl font-semibold text-text-primary mb-4">Token Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-background-dark rounded-lg">
                    <Percent className="w-5 h-5 text-primary-mint" />
                    <div>
                      <p className="text-text-secondary text-sm">Ownership Share</p>
                      <p className="text-text-primary font-semibold">{listing.ownershipPercentage}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-background-dark rounded-lg">
                    <DollarSign className="w-5 h-5 text-primary-mint" />
                    <div>
                      <p className="text-text-secondary text-sm">Listing Price</p>
                      <p className="text-text-primary font-semibold">{listing.price} {listing.currency}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-background-dark rounded-lg">
                    <Calendar className="w-5 h-5 text-primary-mint" />
                    <div>
                      <p className="text-text-secondary text-sm">Listed Date</p>
                      <p className="text-text-primary font-semibold">{formatDate(listing.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-background-dark rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary-mint" />
                    <div>
                      <p className="text-text-secondary text-sm">Status</p>
                      <p className="text-text-primary font-semibold">
                        {listing.isSold ? 'Sold' : listing.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Split Information */}
              {listing.proposedFeeSplits && listing.proposedFeeSplits.length > 0 && (
                <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
                  <h3 className="text-xl font-semibold text-text-primary mb-4">Proposed Fee Splits</h3>
                  <div className="space-y-3">
                    {/* Show current owner's retained shares */}
                    {listing.proposedFeeSplits
                      .map((split, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-background-dark rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-text-primary">{split.label}</span>
                            {split.timeLock > 0 && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full">
                                {split.timeLock}d lock
                              </span>
                            )}
                          </div>
                          <span className="text-primary-mint font-semibold">{split.percentage}%</span>
                        </div>
                      ))}
                    
                    {/* Show new owner's share */}
                    <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400 font-medium">New Owner (Buyer)</span>
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                          Management
                        </span>
                      </div>
                      <span className="text-blue-400 font-semibold">{listing.newOwnerFeeShare}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions & Seller Info */}
            <div className="xl:col-span-1 space-y-6">
              {/* Action Card */}
              <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
                {isCurrentUserSeller ? (
                  <>
                    <h3 className="text-xl font-semibold text-text-primary mb-4">Manage Your Listing</h3>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Price:</span>
                        <span className="text-text-primary font-semibold">{listing.price} {listing.currency}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Ownership:</span>
                        <span className="text-text-primary font-semibold">{listing.ownershipPercentage}%</span>
                      </div>
                      <div className="border-t border-background-elevated pt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span className="text-text-primary">Total:</span>
                          <span className="text-primary-mint">{listing.price} {listing.currency}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleEditListing}
                      className="w-full mb-3"
                    >
                      <Settings className="w-5 h-5 mr-2" />
                      Edit Listing
                    </Button>

                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleRemoveListing}
                      className="w-full"
                    >
                      Remove Listing
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-text-primary mb-4">Purchase</h3>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Price:</span>
                        <span className="text-text-primary font-semibold">{listing.price} {listing.currency}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Ownership:</span>
                        <span className="text-text-primary font-semibold">{listing.ownershipPercentage}%</span>
                      </div>
                      <div className="border-t border-background-elevated pt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span className="text-text-primary">Total:</span>
                          <span className="text-primary-mint">{listing.price} {listing.currency}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleBuyNow}
                      className="w-full mb-3"
                      disabled={listing.isSold || !listing.isActive}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      {listing.isSold ? 'Sold' : 'Buy Now'}
                    </Button>

                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleContactSeller}
                      className="w-full"
                    >
                      Make Offer
                    </Button>
                  </>
                )}
              </div>

              {/* Seller Information */}
              <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-4">Seller Information</h3>
                
                <div className="space-y-4">
                  {/* Profile Header */}
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const username = listing.profiles?.username || 
                          (listing.profiles?.wallet_address ? 
                            `${listing.profiles.wallet_address.slice(0, 6)}...${listing.profiles.wallet_address.slice(-4)}` : 
                            null
                          );
                        if (username) {
                          window.location.href = `/users/${username}`;
                        }
                      }}
                    >
                      {listing.profiles?.profile_image_url ? (
                        <img 
                          src={listing.profiles.profile_image_url} 
                          alt="Profile" 
                          className="w-12 h-12 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                          <User className="w-6 h-6 text-background-dark" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p 
                        className="text-text-primary font-semibold cursor-pointer hover:text-primary-mint transition-colors"
                        onClick={() => {
                          const username = listing.profiles?.username || 
                            (listing.profiles?.wallet_address ? 
                              `${listing.profiles.wallet_address.slice(0, 6)}...${listing.profiles.wallet_address.slice(-4)}` : 
                              null
                            );
                          if (username) {
                            window.location.href = `/users/${username}`;
                          }
                        }}
                      >
                        {listing.profiles?.username || 
                         (listing.profiles?.wallet_address ? 
                           `${listing.profiles.wallet_address.slice(0, 6)}...${listing.profiles.wallet_address.slice(-4)}` : 
                           'Anonymous'
                         )}
                      </p>
                      <p 
                        className="text-text-secondary text-sm cursor-pointer hover:text-primary-mint transition-colors"
                        onClick={() => {
                          if (listing.profiles?.wallet_address) {
                            window.open(`https://solscan.io/account/${listing.profiles.wallet_address}`, '_blank');
                          }
                        }}
                      >
                        {listing.profiles?.wallet_address ? 
                          `Wallet: ${listing.profiles.wallet_address.slice(0, 6)}...${listing.profiles.wallet_address.slice(-4)}` : 
                          'No wallet address'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Bio */}
                  {listing.profiles?.bio && (
                    <div>
                      <p className="text-text-secondary text-sm mb-2">Bio</p>
                      <p className="text-text-primary text-sm leading-relaxed">
                        {listing.profiles.bio}
                      </p>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {listing.profiles?.social_links && listing.profiles.social_links.length > 0 && (
                    <div>
                      <p className="text-text-secondary text-sm mb-2">Social Links</p>
                      <div className="flex flex-wrap gap-2">
                        {listing.profiles.social_links.map((link: any, index: number) => (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-background-dark rounded text-xs text-text-primary hover:text-primary-mint transition-colors"
                          >
                            <span>{link.platform}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Full Wallet Address */}
                  {listing.profiles?.wallet_address && (
                    <div className="p-3 bg-background-dark rounded-lg">
                      <p className="text-text-secondary text-xs mb-1">Full Wallet Address</p>
                      <p 
                        className="text-text-primary font-mono text-sm break-all cursor-pointer hover:text-primary-mint transition-colors"
                        onClick={() => {
                          window.open(`https://solscan.io/account/${listing.profiles.wallet_address}`, '_blank');
                        }}
                      >
                        {listing.profiles.wallet_address}
                      </p>
                    </div>
                  )}
                </div>
              </div>


            </div>
          </div>
        </div>
      </main>

      {/* Edit Listing Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card rounded-2xl border border-background-elevated p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Edit Listing</h2>
              <button
                onClick={() => setShowEditModal(false)}
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
                      By updating this listing, you are modifying the proposed management transfer terms. 
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
                  value={editListingData.price}
                  onChange={(e) => setEditListingData(prev => ({ ...prev, price: e.target.value }))}
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
                  value={editListingData.newOwnerFeeShare}
                  onChange={(e) => setEditListingData(prev => ({ ...prev, newOwnerFeeShare: parseInt(e.target.value) || 0 }))}
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
                  value={editListingData.description}
                  onChange={(e) => setEditListingData(prev => ({ ...prev, description: e.target.value }))}
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
                  {editListingData.newFeeSplits.map((split, index) => (
                    <div key={split.id} className="bg-background-dark rounded-lg p-4 border border-background-elevated">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={!split.isRemoved}
                            onChange={(e) => {
                              const newSplits = [...editListingData.newFeeSplits];
                              newSplits[index].isRemoved = !e.target.checked;
                              setEditListingData({...editListingData, newFeeSplits: newSplits});
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
                                    const newSplits = [...editListingData.newFeeSplits];
                                    newSplits[index].showPlatformDropdown = !newSplits[index].showPlatformDropdown;
                                    setEditListingData({...editListingData, newFeeSplits: newSplits});
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
                                          const newSplits = [...editListingData.newFeeSplits];
                                          newSplits[index].type = 'wallet';
                                          newSplits[index].social_or_wallet = '';
                                          newSplits[index].showPlatformDropdown = false;
                                          setEditListingData({...editListingData, newFeeSplits: newSplits});
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
                                            const newSplits = [...editListingData.newFeeSplits];
                                            newSplits[index].type = 'social';
                                            newSplits[index].social_or_wallet = platform.key + ':';
                                            newSplits[index].showPlatformDropdown = false;
                                            setEditListingData({...editListingData, newFeeSplits: newSplits});
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
                                    const newSplits = [...editListingData.newFeeSplits];
                                    if (split.type === 'wallet') {
                                      newSplits[index].social_or_wallet = e.target.value;
                                      newSplits[index].label = e.target.value;
                                    } else {
                                      const platform = split.social_or_wallet?.split(':')[0] || 'X';
                                      newSplits[index].social_or_wallet = platform + ':' + e.target.value;
                                      newSplits[index].label = platform + ':' + e.target.value;
                                    }
                                    setEditListingData({...editListingData, newFeeSplits: newSplits});
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
                                  const newSplits = [...editListingData.newFeeSplits];
                                  newSplits[index].percentage = parseInt(e.target.value) || 0;
                                  setEditListingData({...editListingData, newFeeSplits: newSplits});
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
                                  const newSplits = [...editListingData.newFeeSplits];
                                  newSplits[index].timeLock = parseInt(e.target.value) || 0;
                                  setEditListingData({...editListingData, newFeeSplits: newSplits});
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
                      setEditListingData(prev => ({
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
                        {editListingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-secondary">New Owner Share:</span>
                      <span className="text-sm text-blue-400">
                        {editListingData.newOwnerFeeShare}%
                      </span>
                    </div>
                    <div className="border-t border-background-elevated pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">Total Percentage:</span>
                        <span className={`text-sm font-bold ${
                          (editListingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + editListingData.newOwnerFeeShare) === 100 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {(editListingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + editListingData.newOwnerFeeShare)}%
                        </span>
                      </div>
                      {(editListingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + editListingData.newOwnerFeeShare) !== 100 && (
                        <p className="text-xs text-red-400 mt-1">
                          Total must equal 100% for a valid listing
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-6 border-t border-background-elevated mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-background-elevated text-text-primary px-4 py-3 rounded-lg font-medium hover:bg-background-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateListing}
                disabled={
                  !editListingData.price || 
                  parseFloat(editListingData.price) <= 0 ||
                  (editListingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + editListingData.newOwnerFeeShare) !== 100 ||
                  isUpdatingListing
                }
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-opacity flex items-center justify-center space-x-2 ${
                  editListingData.price && 
                  parseFloat(editListingData.price) > 0 &&
                  (editListingData.newFeeSplits.filter(s => !s.isRemoved).reduce((sum, split) => sum + split.percentage, 0) + editListingData.newOwnerFeeShare) === 100 &&
                  !isUpdatingListing
                    ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:opacity-90'
                    : 'bg-background-elevated text-text-secondary cursor-not-allowed opacity-50'
                }`}
              >
                {isUpdatingListing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background-dark"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  'Update Listing'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Listing Confirmation Modal */}
      {showRemoveConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card rounded-xl border border-background-elevated max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Remove Listing</h2>
                <button
                  onClick={() => setShowRemoveConfirmModal(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Warning Section */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-500 mb-2">Remove Listing</h3>
                      <p className="text-text-secondary text-sm">
                        Are you sure you want to remove this listing? You can relist it at any time from your token management page.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Listing Info */}
                {listing && (
                  <div className="bg-background-dark rounded-lg p-4 border border-background-elevated">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">Token:</span>
                        <span className="text-sm text-text-primary">{listing.tokenName} ({listing.tokenTicker})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">Price:</span>
                        <span className="text-sm text-text-primary">{listing.price} {listing.currency}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">Ownership:</span>
                        <span className="text-sm text-text-primary">{listing.ownershipPercentage}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-6 border-t border-background-elevated mt-6">
                <button
                  onClick={() => setShowRemoveConfirmModal(false)}
                  className="flex-1 bg-background-elevated text-text-primary px-4 py-3 rounded-lg font-medium hover:bg-background-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemoveListing}
                  disabled={isRemovingListing}
                  className="flex-1 bg-red-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                >
                  {isRemovingListing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Remove Listing</span>
                    </>
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
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
