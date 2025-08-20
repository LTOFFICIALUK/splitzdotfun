'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Copy, CheckCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface TokenData {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  bannerUrl?: string;
  twitterUrl?: string;
  websiteUrl: string;
  tokenAddress: string;
  metadataUrl?: string;
  creatorWallet: string;
  initialBuyAmount: number;
  royaltyRecipients: Array<{
    id: string;
    type: 'wallet' | 'social';
    identifier: string;
    percentage: number;
    label: string;
    isManager: boolean;
    role: string;
  }>;
}

interface TokenPageProps {
  params: {
    ca: string;
  };
}

const TokenPage: React.FC<TokenPageProps> = ({ params }) => {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoading(true);
        
        // For now, we'll simulate fetching token data
        // In production, you'd fetch this from your database or API
        // Use the actual contract address from the URL
        const contractAddress = params.ca;
        
        const mockTokenData: TokenData = {
          name: 'Test Token',
          symbol: 'TEST',
          description: 'A test token created on SplitzFun with automatic royalty routing and management features.',
          imageUrl: 'https://via.placeholder.com/512x512/00ff88/000000?text=TEST',
          bannerUrl: 'https://via.placeholder.com/1500x500/00ff88/000000?text=TEST+TOKEN',
          twitterUrl: 'https://x.com/test',
          websiteUrl: `https://splitz.fun/token/${contractAddress}`,
          tokenAddress: contractAddress,
          creatorWallet: '6m4GhWkYGgrzwjUYC5oZaut3TGqWPV3y94kpcmykeL9E',
          initialBuyAmount: 0.01,
          royaltyRecipients: [
            {
              id: '1',
              type: 'social',
              identifier: 'X:@splitzdotfun',
              percentage: 100,
              label: 'SplitzFun Platform',
              isManager: true,
              role: 'Management'
            }
          ]
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setTokenData(mockTokenData);
      } catch (err) {
        setError('Failed to load token data');
        console.error('Error fetching token data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [params.ca]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/token" />
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-center">
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
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/token" />
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-text-primary mb-4">Token Not Found</h1>
              <p className="text-text-secondary">The token with address {formatAddress(params.ca)} could not be found.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <Header currentPath="/token" />
      
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

          {/* Token Banner */}
          {tokenData.bannerUrl && (
            <div className="mb-8">
              <img
                src={tokenData.bannerUrl}
                alt={`${tokenData.name} banner`}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Token Header */}
          <div className="flex items-start space-x-6 mb-8">
            <img
              src={tokenData.imageUrl}
              alt={tokenData.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-text-primary">{tokenData.name}</h1>
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                  Metadata Ready
                </span>
              </div>
              <p className="text-xl text-text-secondary mb-4">${tokenData.symbol}</p>
              <p className="text-text-secondary">{tokenData.description}</p>
            </div>
          </div>

          {/* Token Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <div className="flex items-center space-x-3 mb-2">
                <TrendingUp className="w-5 h-5 text-primary-mint" />
                <span className="text-text-secondary">Initial Buy</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{tokenData.initialBuyAmount} SOL</p>
            </div>
            
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <div className="flex items-center space-x-3 mb-2">
                <Users className="w-5 h-5 text-primary-mint" />
                <span className="text-text-secondary">Royalty Recipients</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{tokenData.royaltyRecipients.length}</p>
            </div>
            
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <div className="flex items-center space-x-3 mb-2">
                <DollarSign className="w-5 h-5 text-primary-mint" />
                <span className="text-text-secondary">Total Distribution</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {tokenData.royaltyRecipients.reduce((sum, recipient) => sum + recipient.percentage, 0)}%
              </p>
            </div>
          </div>

          {/* Token Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Token Information */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Token Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Contract Address</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-sm text-text-primary bg-background-dark px-2 py-1 rounded">
                      {formatAddress(tokenData.tokenAddress)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(tokenData.tokenAddress)}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-text-secondary">Creator Wallet</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-sm text-text-primary bg-background-dark px-2 py-1 rounded">
                      {formatAddress(tokenData.creatorWallet)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(tokenData.creatorWallet)}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {tokenData.twitterUrl && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Twitter</label>
                    <div className="mt-1">
                      <a
                        href={tokenData.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-mint hover:text-primary-aqua transition-colors flex items-center space-x-1"
                      >
                        <span>View on Twitter</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {tokenData.metadataUrl && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Metadata URL</label>
                    <div className="mt-1">
                      <a
                        href={tokenData.metadataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-mint hover:text-primary-aqua transition-colors flex items-center space-x-1"
                      >
                        <span>View Metadata</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Royalty Distribution */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Royalty Distribution</h2>
              
              <div className="space-y-4">
                {tokenData.royaltyRecipients.map((recipient, index) => (
                  <div key={recipient.id} className="flex items-center justify-between p-3 bg-background-dark rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-text-primary font-medium">{recipient.label}</span>
                        {recipient.isManager && (
                          <span className="text-xs bg-primary-mint/20 text-primary-mint px-2 py-1 rounded-full">
                            Manager
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{recipient.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary-mint">{recipient.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button className="flex-1 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity">
              View on BagsApp
            </button>
            <button className="flex-1 bg-background-elevated text-text-primary font-semibold py-3 px-6 rounded-lg hover:bg-background-dark transition-colors">
              Trade on Marketplace
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TokenPage;
