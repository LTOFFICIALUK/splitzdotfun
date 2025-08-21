'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MarketplaceFilters from '@/components/ui/MarketplaceFilters';
import ListingCard from '@/components/ui/ListingCard';
import AuctionCard from '@/components/ui/AuctionCard';
import { ShoppingCart, Gavel, TrendingUp, Clock } from 'lucide-react';

interface MarketplaceListing {
  id: string;
  type: 'listing' | 'auction';
  tokenName: string;
  tokenTicker: string;
  tokenAddress: string;
  ownershipPercentage: number;
  price: number;
  currency: 'SOL' | 'USD';
  description: string;
  seller: string;
  timeLeft?: string;
  bids?: number;
  endTime?: string;
  imageUrl: string;
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
  };
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'auctions'>('listings');
  const [sortBy, setSortBy] = useState('newest');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [auctions, setAuctions] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketplaceData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/marketplace/listings?activeOnly=true');
        
        if (!response.ok) {
          throw new Error('Failed to fetch marketplace data');
        }

        const result = await response.json();
        
        if (result.success) {
          // Transform database listings to marketplace format
          const transformedListings: MarketplaceListing[] = result.data.map((dbListing: DatabaseListing) => ({
            id: dbListing.id,
            type: 'listing' as const,
            tokenName: dbListing.tokens.name || 'Unknown Token',
            tokenTicker: dbListing.tokens.symbol || 'UNKNOWN',
            tokenAddress: dbListing.tokens.contract_address,
            ownershipPercentage: dbListing.new_owner_fee_share,
            price: dbListing.listing_price,
            currency: 'SOL' as const,
            description: dbListing.description || 'No description provided',
            seller: dbListing.profiles.username || dbListing.profiles.wallet_address.slice(0, 8) + '...',
            imageUrl: dbListing.tokens.image_url || '/images/placeholder-token.png',
          }));

          setListings(transformedListings);
          setAuctions([]); // No auctions for now, only listings
        } else {
          throw new Error(result.error || 'Failed to fetch marketplace data');
        }
      } catch (err) {
        console.error('Error fetching marketplace data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch marketplace data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceData();
  }, []);

  // Calculate stats from real data
  const stats = [
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      label: 'Active Listings',
      value: listings.length.toString(),
      change: '+0',
      changeType: 'positive' as const,
    },
    {
      icon: <Gavel className="w-6 h-6" />,
      label: 'Live Auctions',
      value: auctions.length.toString(),
      change: '+0',
      changeType: 'positive' as const,
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Total Volume',
      value: `${listings.reduce((sum, listing) => sum + listing.price, 0).toFixed(1)} SOL`,
      change: '+0%',
      changeType: 'positive' as const,
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'Avg. Sale Time',
      value: 'N/A',
      change: '0%',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <Header currentPath="/marketplace" />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-background-card to-background-elevated">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-background-dark rounded-full px-4 py-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-primary-mint" />
                <span className="text-sm font-medium text-text-primary">Ownership Marketplace</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                Token Ownership Marketplace
              </h1>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Buy and sell token ownership rights. Trade creator rights like startup equity in a transparent marketplace.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <div key={index} className="bg-background-dark rounded-xl p-6 border border-background-elevated">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.change}
                  </p>
                </div>
              ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-background-dark rounded-xl p-1 border border-background-elevated">
                <button
                  onClick={() => setActiveTab('listings')}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'listings'
                      ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 inline mr-2" />
                  Fixed Price Listings
                </button>
                <button
                  onClick={() => setActiveTab('auctions')}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'auctions'
                      ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Gavel className="w-4 h-4 inline mr-2" />
                  Live Auctions
                </button>
              </div>
            </div>

            {/* Filters */}
            <MarketplaceFilters 
              activeTab={activeTab}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </section>

        {/* Marketplace Content */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-mint mx-auto mb-4"></div>
                <p className="text-text-secondary">Loading marketplace data...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Error Loading Marketplace</h3>
                <p className="text-text-secondary mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
              </div>
            ) : activeTab === 'listings' ? (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-6">Fixed Price Listings</h2>
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-background-card rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-8 h-8 text-text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">No Active Listings</h3>
                    <p className="text-text-secondary">There are currently no active marketplace listings.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-6">Live Auctions</h2>
                {auctions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-background-card rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gavel className="w-8 h-8 text-text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">No Live Auctions</h3>
                    <p className="text-text-secondary">There are currently no active auctions.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {auctions.map((auction) => (
                      <AuctionCard key={auction.id} auction={auction} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 bg-background-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              How the Marketplace Works
            </h3>
            <p className="text-text-secondary text-lg leading-relaxed mb-8">
              Buy and sell token ownership rights with complete transparency and security.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-4">
                  <span className="text-background-dark font-bold text-lg">1</span>
                </div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">List Ownership</h4>
                <p className="text-text-secondary text-sm">
                  Token creators can list ownership percentages for sale with fixed prices or auctions.
                </p>
              </div>
              
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-4">
                  <span className="text-background-dark font-bold text-lg">2</span>
                </div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">Place Bids</h4>
                <p className="text-text-secondary text-sm">
                  Buyers can place bids on auctions or purchase fixed-price listings directly.
                </p>
              </div>
              
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-4">
                  <span className="text-background-dark font-bold text-lg">3</span>
                </div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">Transfer Rights</h4>
                <p className="text-text-secondary text-sm">
                  Ownership rights are automatically transferred upon successful purchase.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
