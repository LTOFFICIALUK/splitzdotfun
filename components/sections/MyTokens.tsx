import React from 'react';
import TokenCard from '../ui/TokenCard';
import Button from '../ui/Button';
import { Wallet, Plus, TrendingUp, Settings } from 'lucide-react';
import { Token } from '@/types';
import { useWallet } from '../ui/WalletProvider';

const MyTokens: React.FC = () => {
  const { isConnected, publicKey } = useWallet();

  // Mock data for connected state
  const mockTokens: Token[] = [
    {
      id: 'vibe-1',
      name: 'VIBE',
      ticker: 'VIBE',
      address: 'D3Tj...YrJh',
      logoUrl: '/images/placeholder-token.png',
      mcap: 4050000,
      change24h: 12.6,
      creatorRewardsSOL: 0.209,
    },
    {
      id: 'moon-1',
      name: 'MOON',
      ticker: 'MOON',
      address: 'F7Kp...XqLm',
      logoUrl: '/images/placeholder-token.png',
      mcap: 1200000,
      change24h: -5.2,
      creatorRewardsSOL: 0.089,
    },
  ];

  const handleClaim = (tokenId: string) => {
    alert(`Claiming rewards for ${tokenId}... (This is a stub)`);
  };

  const handleManage = (tokenId: string) => {
    alert(`Managing ${tokenId}... (This is a stub)`);
  };

  return (
    <section className="py-20 bg-background-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            My Tokens
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Manage your token portfolio, claim rewards, and track your earnings from royalty distributions.
          </p>
        </div>

        {/* Content */}
        {!isConnected ? (
          // Empty State
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-background-elevated flex items-center justify-center">
              <Wallet className="w-12 h-12 text-text-secondary" />
            </div>
            <h3 className="text-2xl font-semibold text-text-primary mb-4">
              Connect Your Wallet
            </h3>
            <p className="text-text-secondary max-w-md mx-auto">
              Connect your Solana wallet to view your tokens, claim rewards, and manage your portfolio.
            </p>
          </div>
        ) : (
          // Connected State
          <div className="space-y-6">
            {/* Wallet Info */}
            <div className="bg-background-dark rounded-lg p-4 border border-background-elevated">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary-mint to-primary-aqua rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-background-dark" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Connected Wallet</p>
                    <p className="text-text-primary font-mono text-sm">{publicKey}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">Total Value</p>
                  <p className="text-text-primary font-semibold">$5.2M</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-background-dark border border-background-elevated rounded-lg p-4 hover:bg-background-elevated transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-mint to-primary-aqua rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-background-dark" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">Create Token</p>
                    <p className="text-xs text-text-secondary">Launch a new token</p>
                  </div>
                </div>
              </button>
              
              <button className="bg-background-dark border border-background-elevated rounded-lg p-4 hover:bg-background-elevated transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-background-dark" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">Claim Rewards</p>
                    <p className="text-xs text-text-secondary">Collect your earnings</p>
                  </div>
                </div>
              </button>
              
              <button className="bg-background-dark border border-background-elevated rounded-lg p-4 hover:bg-background-elevated transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-background-dark" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">Manage</p>
                    <p className="text-xs text-text-secondary">Configure settings</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Token Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockTokens.map((token) => (
                <TokenCard
                  key={token.id}
                  token={token}
                  onClaim={() => handleClaim(token.id)}
                  onManage={() => handleManage(token.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MyTokens;
