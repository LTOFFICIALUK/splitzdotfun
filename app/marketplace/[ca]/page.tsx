'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
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
  Percent
} from 'lucide-react';

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
  
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            seller: dbListing.profiles.username || dbListing.profiles.wallet_address.slice(0, 8) + '...',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/marketplace" />
        <main className="pt-16">
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
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/marketplace" />
        <main className="pt-16">
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
    <div className="min-h-screen bg-background-dark">
      <Header currentPath="/marketplace" />
      
      <main className="pt-16">
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
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                      <span className="text-background-dark font-bold text-2xl">{listing.tokenTicker.charAt(0)}</span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-text-primary">{listing.tokenName}</h1>
                      <p className="text-text-secondary font-mono text-sm">{listing.tokenTicker}</p>
                      <p className="text-text-secondary font-mono text-xs">{listing.tokenAddress}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
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

                <p className="text-text-primary text-lg leading-relaxed">
                  {listing.description}
                </p>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-background-elevated">
                  <div className="flex items-center space-x-4 text-sm text-text-secondary">
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
              {/* Buy Now Card */}
              <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
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
                      {console.log('Rendering seller info with profiles:', listing.profiles)}
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

      <Footer />
    </div>
  );
}
