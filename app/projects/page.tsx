'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Token } from '@/types';

const ProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'launched' | 'delegated'>('launched');

  // Placeholder data for launched tokens
  const launchedTokens: Token[] = [
    {
      id: '1',
      name: 'MemeCoin Alpha',
      ticker: 'MEME',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      logoUrl: '/placeholder-logo.png',
      mcap: 2500000,
      change24h: 15.5,
      creatorRewardsSOL: 45.2,
    },
    {
      id: '2',
      name: 'DeFi Protocol Token',
      ticker: 'DEFI',
      address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      logoUrl: '/placeholder-logo.png',
      mcap: 1800000,
      change24h: -8.3,
      creatorRewardsSOL: 32.1,
    },
    {
      id: '3',
      name: 'Gaming Guild Token',
      ticker: 'GGT',
      address: '3xJw8bG4pE1L7mK9nQ2vR5tY8uI6oP0aZ1xE4wS7dF2gH',
      logoUrl: '/placeholder-logo.png',
      mcap: 950000,
      change24h: 22.7,
      creatorRewardsSOL: 18.9,
    },
  ];

  // Placeholder data for delegated tokens
  const delegatedTokens: Token[] = [
    {
      id: '4',
      name: 'Community Token Beta',
      ticker: 'CTB',
      address: '5yL9vE3mN2pQ8rT6wX1zA4bC7dF0gH3jK6nM9oP2qR5sU',
      logoUrl: '/placeholder-logo.png',
      mcap: 3200000,
      change24h: 12.1,
      creatorRewardsSOL: 28.5,
    },
    {
      id: '5',
      name: 'NFT Marketplace Token',
      ticker: 'NMT',
      address: '8zK4wR7tY2uI5oP1aZ3xE6wS9dF2gH4jK7nM0oP3qR6sU',
      logoUrl: '/placeholder-logo.png',
      mcap: 4100000,
      change24h: -5.2,
      creatorRewardsSOL: 67.3,
    },
  ];

  const currentTokens = activeTab === 'launched' ? launchedTokens : delegatedTokens;

  const formatMarketCap = (mcap: number) => {
    if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(1)}B`;
    if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(1)}M`;
    if (mcap >= 1e3) return `$${(mcap / 1e3).toFixed(1)}K`;
    return `$${mcap.toFixed(0)}`;
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header currentPath="/projects" />
      
      {/* Main Content */}
      <main className="flex-1 pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="pt-6 pb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              My Projects
            </h1>
            <p className="text-text-secondary">
              Manage tokens you've launched and track delegated fee earnings
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-background-card rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('launched')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'launched'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Launched Tokens ({launchedTokens.length})
            </button>
            <button
              onClick={() => setActiveTab('delegated')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'delegated'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Delegated Fees ({delegatedTokens.length})
            </button>
          </div>

          {/* Simple List */}
          {currentTokens.length > 0 ? (
            <div className="space-y-4 pb-8">
              {currentTokens.map((token) => (
                <a
                  key={token.id}
                  href={`/projects/${token.id}`}
                  className="block bg-background-card rounded-lg border border-background-elevated p-4 hover:border-primary-mint/30 hover:bg-background-elevated transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    {/* Token Info */}
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                        <span className="text-background-dark font-bold text-sm">{token.ticker.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">{token.name}</h3>
                        <p className="text-text-secondary text-xs font-mono">{token.address.slice(0, 4)}...{token.address.slice(-4)}</p>
                      </div>
                    </div>
                    
                    {/* Market Data */}
                    <div className="text-right">
                      <p className="font-semibold text-text-primary">{formatMarketCap(token.mcap)}</p>
                      <p className={`text-xs font-medium ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatChange(token.change24h)}
                      </p>
                      <p className="text-text-secondary text-xs">{token.creatorRewardsSOL.toFixed(1)} SOL</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 pb-8">
              <div className="w-16 h-16 bg-background-card rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No {activeTab === 'launched' ? 'launched tokens' : 'delegated fees'} yet
              </h3>
              <p className="text-text-secondary mb-6">
                {activeTab === 'launched' 
                  ? 'Launch your first token to start earning royalties'
                  : 'Get delegated fees when others route royalties to your wallet'
                }
              </p>
              <a
                href="/create"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Create Your First Token
              </a>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProjectsPage;
