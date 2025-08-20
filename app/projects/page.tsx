'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useWallet } from '@/components/ui/WalletProvider';

interface UserToken {
  id: string;
  name: string;
  symbol: string;
  contract_address: string;
  image_url: string | null;
  social_link: string | null;
  created_at: string;
  fees_generated: number;
  current_owner: string;
  royalty_earners: Array<{
    social_or_wallet: string;
    role: string;
    percentage: number;
  }>;
  total_fees_earned: number;
  fees_owed_per_earner: Record<string, number>;
  fees_claimed_per_earner: Record<string, number>;
  total_fees_claimed: number;
  type: 'owned' | 'royalty' | 'deployed';
}

interface UserTokensData {
  owned: UserToken[];
  royalty: UserToken[];
  deployed: UserToken[];
}

const ProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'owned' | 'royalty' | 'deployed'>('owned');
  const [tokens, setTokens] = useState<UserTokensData>({ owned: [], royalty: [], deployed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { publicKey, isConnected } = useWallet();

  useEffect(() => {
    const fetchUserTokens = async () => {
      if (!isConnected || !publicKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/user-tokens?user=${publicKey}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user tokens');
        }

        const result = await response.json();
        
        if (result.success) {
          setTokens(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch tokens');
        }
      } catch (err) {
        console.error('Error fetching user tokens:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
      } finally {
        setLoading(false);
      }
    };

    fetchUserTokens();
  }, [isConnected, publicKey]);

  const getCurrentTokens = () => {
    switch (activeTab) {
      case 'owned':
        return tokens.owned;
      case 'royalty':
        return tokens.royalty;
      case 'deployed':
        return tokens.deployed;
      default:
        return [];
    }
  };

  const currentTokens = getCurrentTokens();

  const formatFees = (fees: number) => {
    return `${fees.toFixed(2)} SOL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTokenImage = (token: UserToken) => {
    if (token.image_url) {
      return token.image_url;
    }
    // Fallback to generated logo based on symbol
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="%2300ff88" rx="8"/><text x="16" y="20" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="%23000">${token.symbol.charAt(0)}</text></svg>`;
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

          {/* Wallet Connection Check */}
          {!isConnected && (
            <div className="text-center py-12 pb-8">
              <div className="w-16 h-16 bg-background-card rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Connect your wallet
              </h3>
              <p className="text-text-secondary mb-6">
                Connect your wallet to view your tokens and royalty earnings
              </p>
            </div>
          )}

          {/* Tab Navigation */}
          {isConnected && (
            <div className="flex space-x-1 bg-background-card rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('owned')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'owned'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Owned Tokens ({tokens.owned.length})
            </button>
            <button
              onClick={() => setActiveTab('royalty')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'royalty'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Royalty Tokens ({tokens.royalty.length})
            </button>
            <button
              onClick={() => setActiveTab('deployed')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'deployed'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Deployed Tokens ({tokens.deployed.length})
                          </button>
            </div>
          )}

          {/* Loading State */}
          {isConnected && loading && (
            <div className="text-center py-12 pb-8">
              <div className="w-16 h-16 bg-background-card rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-mint"></div>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Loading your tokens...
              </h3>
            </div>
          )}

          {/* Error State */}
          {isConnected && error && !loading && (
            <div className="text-center py-12 pb-8">
              <div className="w-16 h-16 bg-background-card rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Error loading tokens
              </h3>
              <p className="text-text-secondary mb-6">
                {error}
              </p>
            </div>
          )}

          {/* Token List */}
          {isConnected && !loading && !error && currentTokens.length > 0 && (
            <div className="space-y-4 pb-8">
              {currentTokens.map((token) => (
                <a
                  key={token.id}
                  href={`/token/${token.contract_address}`}
                  className="block bg-background-card rounded-lg border border-background-elevated p-4 hover:border-primary-mint/30 hover:bg-background-elevated transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    {/* Token Info */}
                    <div className="flex items-center space-x-3">
                      <img
                        src={getTokenImage(token)}
                        alt={token.name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-text-primary">{token.name}</h3>
                        <p className="text-text-secondary text-xs font-mono">{token.contract_address.slice(0, 4)}...{token.contract_address.slice(-4)}</p>
                      </div>
                    </div>
                    
                    {/* Token Data */}
                    <div className="text-right">
                      <p className="font-semibold text-text-primary">{token.symbol}</p>
                      <p className="text-text-secondary text-xs">{formatDate(token.created_at)}</p>
                      <p className="text-primary-mint text-xs font-medium">{formatFees(token.total_fees_earned)}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Empty State */}
          {isConnected && !loading && !error && currentTokens.length === 0 && (
            <div className="text-center py-12 pb-8">
              <div className="w-16 h-16 bg-background-card rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No {activeTab === 'owned' ? 'owned tokens' : activeTab === 'royalty' ? 'royalty tokens' : 'deployed tokens'} yet
              </h3>
              <p className="text-text-secondary mb-6">
                {activeTab === 'owned' 
                  ? 'You don\'t own any tokens yet'
                  : activeTab === 'royalty'
                  ? 'You\'re not earning royalties from any tokens yet'
                  : 'You haven\'t deployed any tokens yet'
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
