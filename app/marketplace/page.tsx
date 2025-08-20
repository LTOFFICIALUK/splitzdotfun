'use client';

import React, { useState } from 'react';
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

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'auctions'>('listings');
  const [sortBy, setSortBy] = useState('newest');

  // Mock marketplace data
  const marketplaceData: MarketplaceListing[] = [
    {
      id: '1',
      type: 'listing',
      tokenName: 'FROGZ',
      tokenTicker: 'FROGZ',
      tokenAddress: 'A1B2...C3D4',
      ownershipPercentage: 15,
      price: 25,
      currency: 'SOL',
      description: 'Selling 15% ownership of FROGZ token. This includes creator rights and royalty distribution.',
      seller: '@memelord',
      imageUrl: '/images/placeholder-token.png',
    },
    {
      id: '2',
      type: 'auction',
      tokenName: 'PEPE',
      tokenTicker: 'PEPE',
      tokenAddress: 'E5F6...G7H8',
      ownershipPercentage: 10,
      price: 18.5,
      currency: 'SOL',
      description: 'Auctioning 10% ownership of PEPE token. Current highest bid: 18.5 SOL',
      seller: '@cryptoking',
      timeLeft: '2d 14h 32m',
      bids: 12,
      endTime: '2024-01-15T18:00:00Z',
      imageUrl: '/images/placeholder-token.png',
    },
    {
      id: '3',
      type: 'listing',
      tokenName: 'BONK',
      tokenTicker: 'BONK',
      tokenAddress: 'Q7R8...S9T0',
      ownershipPercentage: 20,
      price: 45,
      currency: 'SOL',
      description: 'Selling 20% ownership of BONK token. Includes management rights and revenue sharing.',
      seller: '@solanaqueen',
      imageUrl: '/images/placeholder-token.png',
    },
    {
      id: '4',
      type: 'auction',
      tokenName: 'VIBE',
      tokenTicker: 'VIBE',
      tokenAddress: 'D3Tj...YrJh',
      ownershipPercentage: 8,
      price: 12.8,
      currency: 'SOL',
      description: 'Auctioning 8% ownership of VIBE token. Limited time opportunity!',
      seller: '@tokenlord',
      timeLeft: '1d 8h 15m',
      bids: 8,
      endTime: '2024-01-14T12:00:00Z',
      imageUrl: '/images/placeholder-token.png',
    },
    {
      id: '5',
      type: 'listing',
      tokenName: 'MOON',
      tokenTicker: 'MOON',
      tokenAddress: 'F7Kp...XqLm',
      ownershipPercentage: 12,
      price: 22,
      currency: 'SOL',
      description: 'Selling 12% ownership of MOON token. Great opportunity for long-term holders.',
      seller: '@moonboy',
      imageUrl: '/images/placeholder-token.png',
    },
    {
      id: '6',
      type: 'auction',
      tokenName: 'ROCKET',
      tokenTicker: 'ROCKET',
      tokenAddress: 'G9H0...I1J2',
      ownershipPercentage: 25,
      price: 35,
      currency: 'SOL',
      description: 'Auctioning 25% ownership of ROCKET token. This is a significant stake!',
      seller: '@rocketman',
      timeLeft: '3d 6h 45m',
      bids: 15,
      endTime: '2024-01-16T20:00:00Z',
      imageUrl: '/images/placeholder-token.png',
    },
  ];

  const listings = marketplaceData.filter(item => item.type === 'listing');
  const auctions = marketplaceData.filter(item => 
    item.type === 'auction' && 
    item.timeLeft && 
    item.bids !== undefined && 
    item.endTime
  ) as (MarketplaceListing & {
    timeLeft: string;
    bids: number;
    endTime: string;
  })[];

  const stats = [
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      label: 'Active Listings',
      value: '247',
      change: '+12',
      changeType: 'positive' as const,
    },
    {
      icon: <Gavel className="w-6 h-6" />,
      label: 'Live Auctions',
      value: '89',
      change: '+5',
      changeType: 'positive' as const,
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Total Volume',
      value: '1.2M SOL',
      change: '+8.5%',
      changeType: 'positive' as const,
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'Avg. Sale Time',
      value: '2.4 days',
      change: '-12%',
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
            {activeTab === 'listings' ? (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-6">Fixed Price Listings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-6">Live Auctions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {auctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
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
