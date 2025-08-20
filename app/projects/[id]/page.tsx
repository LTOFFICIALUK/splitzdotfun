'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Token } from '@/types';

interface ProjectDetailPageProps {
  params: {
    id: string;
  };
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ params }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'management' | 'analytics' | 'settings'>('overview');

  // Placeholder project data - in real app this would come from API/database
  const project: Token & {
    description: string;
    totalSupply: number;
    circulatingSupply: number;
    holders: number;
    creatorAddress: string;
    launchDate: string;
    feeShare: number;
    delegatedWallets: Array<{
      address: string;
      percentage: number;
      earned: number;
    }>;
  } = {
    id: params.id,
    name: 'MemeCoin Alpha',
    ticker: 'MEME',
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    logoUrl: '/placeholder-logo.png',
    mcap: 2500000,
    change24h: 15.5,
    creatorRewardsSOL: 45.2,
    description: 'A revolutionary meme coin that combines viral marketing with sustainable tokenomics. Built on Solana for lightning-fast transactions and minimal fees.',
    totalSupply: 1000000000,
    circulatingSupply: 750000000,
    holders: 12500,
    creatorAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    launchDate: '2024-01-15',
    feeShare: 2.5,
    delegatedWallets: [
      { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', percentage: 0.5, earned: 12.3 },
      { address: '3xJw8bG4pE1L7mK9nQ2vR5tY8uI6oP0aZ1xE4wS7dF2gH', percentage: 0.3, earned: 8.1 },
      { address: '5yL9vE3mN2pQ8rT6wX1zA4bC7dF0gH3jK6nM9oP2qR5sU', percentage: 0.2, earned: 5.4 },
    ],
  };

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

  const formatNumber = (num: number) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header currentPath="/projects" />
      
      {/* Main Content */}
      <main className="flex-1 pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6">
            <a
              href="/projects"
              className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back to Projects
            </a>
          </div>

          {/* Project Header */}
          <div className="bg-background-card rounded-xl border border-background-elevated p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                  <span className="text-background-dark font-bold text-2xl">{project.ticker.charAt(0)}</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-text-primary mb-1">{project.name}</h1>
                  <p className="text-text-secondary font-mono">{project.address}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-text-primary">{formatMarketCap(project.mcap)}</p>
                <p className={`text-lg font-medium ${project.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatChange(project.change24h)}
                </p>
              </div>
            </div>
            <p className="text-text-secondary mt-4">{project.description}</p>
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
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-primary-mint text-background-dark'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-background-card rounded-xl border border-background-elevated p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Project Overview</h2>
                
                {/* Key Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-background-dark rounded-lg p-4">
                    <p className="text-text-secondary text-sm mb-1">Total Supply</p>
                    <p className="text-lg font-semibold text-text-primary">{formatNumber(project.totalSupply)}</p>
                  </div>
                  <div className="bg-background-dark rounded-lg p-4">
                    <p className="text-text-secondary text-sm mb-1">Circulating Supply</p>
                    <p className="text-lg font-semibold text-text-primary">{formatNumber(project.circulatingSupply)}</p>
                  </div>
                  <div className="bg-background-dark rounded-lg p-4">
                    <p className="text-text-secondary text-sm mb-1">Holders</p>
                    <p className="text-lg font-semibold text-text-primary">{formatNumber(project.holders)}</p>
                  </div>
                  <div className="bg-background-dark rounded-lg p-4">
                    <p className="text-text-secondary text-sm mb-1">Fee Share</p>
                    <p className="text-lg font-semibold text-text-primary">{project.feeShare}%</p>
                  </div>
                </div>

                {/* Fee Distribution */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Fee Distribution</h3>
                  <div className="space-y-3">
                    {project.delegatedWallets.map((wallet, index) => (
                      <div key={index} className="flex items-center justify-between bg-background-dark rounded-lg p-3">
                        <div>
                          <p className="text-text-primary font-mono text-sm">{wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}</p>
                          <p className="text-text-secondary text-xs">{wallet.percentage}% fee share</p>
                        </div>
                        <div className="text-right">
                          <p className="text-text-primary font-semibold">{wallet.earned.toFixed(1)} SOL</p>
                          <p className="text-text-secondary text-xs">earned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'management' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Project Management</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-background-dark rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Quick Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                        Update Token Info
                      </button>
                      <button className="w-full bg-background-elevated text-text-primary px-4 py-2 rounded-lg font-medium hover:bg-background-card transition-colors">
                        Manage Fee Distribution
                      </button>
                      <button className="w-full bg-background-elevated text-text-primary px-4 py-2 rounded-lg font-medium hover:bg-background-card transition-colors">
                        View Transaction History
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-background-dark rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Recent Activity</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Fee collected</span>
                        <span className="text-text-primary">+2.3 SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">New holder</span>
                        <span className="text-text-primary">+1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Market cap change</span>
                        <span className="text-green-400">+15.5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Analytics & Performance</h2>
                
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-background-dark rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Analytics Coming Soon</h3>
                  <p className="text-text-secondary">
                    Detailed charts and performance metrics will be available here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Project Settings</h2>
                
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-background-dark rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Settings Coming Soon</h3>
                  <p className="text-text-secondary">
                    Project configuration and advanced settings will be available here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProjectDetailPage;
