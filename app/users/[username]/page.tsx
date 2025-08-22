'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, ExternalLink, Calendar, Wallet } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/ui/ListingCard';

interface UserProfile {
  id: string;
  username: string | null;
  wallet_address: string;
  bio: string | null;
  profile_image_url: string | null;
  social_links: any[];
  created_at: string;
  updated_at: string;
}

interface UserToken {
  id: string;
  name: string;
  symbol: string;
  contract_address: string;
  image_url: string | null;
  created_at: string;
}

interface UserListing {
  id: string;
  token_id: string;
  listing_price: number;
  description: string | null;
  new_owner_fee_share: number;
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
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [listings, setListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const profileResponse = await fetch(`/api/profiles/${username}`);
        if (!profileResponse.ok) {
          throw new Error('User not found');
        }
        const profileData = await profileResponse.json();
        setProfile(profileData.data);

        // Fetch user's tokens
        const tokensResponse = await fetch(`/api/profiles/${username}/tokens`);
        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json();
          setTokens(tokensData.data || []);
        }

        // Fetch user's marketplace listings
        const listingsResponse = await fetch(`/api/profiles/${username}/listings`);
        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          setListings(listingsData.data || []);
        }

      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserData();
    }
  }, [username]);

  const handleWalletClick = () => {
    if (profile?.wallet_address) {
      window.open(`https://solscan.io/account/${profile.wallet_address}`, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath={`/users/${username}`} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-text-primary">Loading user profile…</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath={`/users/${username}`} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-text-primary text-center">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <p className="text-text-secondary">The user "{username}" could not be found.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header currentPath={`/users/${username}`} />
      
      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-background-card to-background-elevated border-b border-background-elevated">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center space-x-6">
              {/* Profile Image */}
              <div className="w-24 h-24 rounded-full overflow-hidden">
                {profile.profile_image_url ? (
                  <img 
                    src={profile.profile_image_url} 
                    alt={profile.username || 'Profile'} 
                    className="w-24 h-24 object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                    <User className="w-12 h-12 text-background-dark" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                  {profile.username || `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`}
                </h1>
                
                <div className="flex flex-col space-y-1 text-text-secondary mb-3">
                  <div className="flex items-center space-x-1 cursor-pointer hover:text-primary-mint transition-colors" onClick={handleWalletClick}>
                    <Wallet className="w-4 h-4" />
                    <span className="underline">{profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(profile.created_at)}</span>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-text-primary max-w-2xl">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Social Links */}
            {profile.social_links && profile.social_links.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">Social Links</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.social_links.map((link: any, index: number) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-3 py-2 bg-background-dark rounded-lg text-text-primary hover:text-primary-mint transition-colors"
                    >
                      <span>{link.platform}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          {/* User's Tokens */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Tokens Created</h2>
            {tokens.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tokens.map((token) => (
                  <Link 
                    key={token.id} 
                    href={`/token/${token.contract_address}`}
                    className="block bg-background-card rounded-2xl border border-background-elevated p-6 hover:border-primary-mint/30 transition-all duration-200 hover:scale-105 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                        <span className="text-background-dark font-bold text-lg">
                          {token.symbol ? token.symbol.charAt(0) : 'T'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-text-primary truncate">{token.name || 'Unknown Token'}</h3>
                        <p className="text-text-secondary text-sm font-mono truncate">{token.contract_address}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-background-card rounded-2xl border border-background-elevated">
                <p className="text-text-secondary">No tokens created yet.</p>
              </div>
            )}
          </div>

          {/* User's Marketplace Listings */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Marketplace Listings</h2>
            {listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {listings.map((listing) => {
                  // Transform the listing data to match ListingCard interface
                  const transformedListing = {
                    id: listing.id,
                    tokenName: listing.tokens?.name || 'Unknown Token',
                    tokenTicker: listing.tokens?.symbol || 'UNKNOWN',
                    tokenAddress: listing.tokens?.contract_address || '',
                    ownershipPercentage: listing.new_owner_fee_share,
                    price: listing.listing_price,
                    currency: 'SOL' as const,
                    description: listing.description || '',
                    seller: profile?.username || `${profile?.wallet_address?.slice(0, 6)}...${profile?.wallet_address?.slice(-4)}`,
                    imageUrl: listing.tokens?.image_url || '/images/placeholder-token.png',
                  };
                  
                  return <ListingCard key={listing.id} listing={transformedListing} />;
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-background-card rounded-2xl border border-background-elevated">
                <p className="text-text-secondary">No active marketplace listings.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
