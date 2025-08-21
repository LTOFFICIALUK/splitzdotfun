'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, TrendingUp, Users, DollarSign, ArrowRight, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { RoyaltyLeaderboardEntry, RoyaltyLeaderboardResponse } from '@/types/royalty-leaderboard';

const LeaderboardPage: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<RoyaltyLeaderboardEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | 'all_time'>('7d');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalEarners: number;
    totalEarnings: number;
    averageEarnings: number;
  }>({ totalEarners: 0, totalEarnings: 0, averageEarnings: 0 });

  const timePeriods = [
    { value: '24h', label: 'Past 24h', icon: Calendar },
    { value: '7d', label: 'Past 7 days', icon: TrendingUp },
    { value: '30d', label: 'Past 30 days', icon: Users },
    { value: 'all_time', label: 'All time', icon: Trophy },
  ];

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  };

  // Helper function to format SOL
  const formatSOL = (amount: number): string => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K SOL`;
    } else {
      return `${amount.toFixed(2)} SOL`;
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async (period: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/royalty-leaderboard?period=${period}&limit=100`);
      const data: RoyaltyLeaderboardResponse = await response.json();
      
      if (data.success) {
        setLeaderboardData(data.data);
        
        // Calculate stats
        const totalEarnings = data.data.reduce((sum, entry) => sum + entry.total_earnings_usd, 0);
        const averageEarnings = data.data.length > 0 ? totalEarnings / data.data.length : 0;
        
        setStats({
          totalEarners: data.data.length,
          totalEarnings,
          averageEarnings
        });
      } else {
        setError(data.error || 'Failed to fetch leaderboard data');
      }
    } catch (err) {
      setError('Failed to fetch leaderboard data');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(selectedPeriod);
  }, [selectedPeriod]);

  const handleCreateToken = () => {
    window.location.href = '/create';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-background-dark';
    } else if (rank === 2) {
      return 'bg-gradient-to-r from-gray-300 to-gray-500 text-background-dark';
    } else if (rank === 3) {
      return 'bg-gradient-to-r from-amber-600 to-amber-800 text-background-dark';
    } else {
      return 'bg-background-elevated text-text-secondary';
    }
  };

  const getInitials = (socialOrWallet: string) => {
    if (socialOrWallet.startsWith('@')) {
      return socialOrWallet.charAt(1).toUpperCase();
    } else if (socialOrWallet.length > 0) {
      return socialOrWallet.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <div className="bg-background-card border-b border-background-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3 mb-4 sm:mb-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                <Trophy className="w-6 h-6 text-background-dark" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
                  Royalty Leaderboard
                </h1>
                <p className="text-text-secondary">
                  Top royalty earners on SplitzFun
                </p>
              </div>
            </div>
            
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateToken}
              className="flex items-center"
            >
              Launch Token
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-background-card rounded-2xl p-6 border border-background-elevated">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                <Users className="w-5 h-5 text-background-dark" />
              </div>
              <div>
                <p className="text-text-secondary text-sm">Total Earners</p>
                <p className="text-2xl font-bold text-text-primary">{stats.totalEarners}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-background-card rounded-2xl p-6 border border-background-elevated">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary-aqua to-primary-mint flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-background-dark" />
              </div>
              <div>
                <p className="text-text-secondary text-sm">Total Earnings</p>
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(stats.totalEarnings)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-background-card rounded-2xl p-6 border border-background-elevated">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-background-dark" />
              </div>
              <div>
                <p className="text-text-secondary text-sm">Average Earnings</p>
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(stats.averageEarnings)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Period Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {timePeriods.map((period) => {
            const Icon = period.icon;
            return (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-primary-mint text-background-dark border-primary-mint'
                    : 'bg-background-card text-text-secondary border-background-elevated hover:bg-background-elevated'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{period.label}</span>
              </button>
            );
          })}
        </div>

        {/* Leaderboard */}
        <div className="bg-background-card rounded-2xl border border-background-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-mint" />
              <span className="ml-3 text-text-secondary">Loading leaderboard...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-text-secondary mb-4">{error}</p>
                <Button variant="outline" onClick={() => fetchLeaderboard(selectedPeriod)}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-background-dark" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">No Royalty Earners Yet</h3>
                <p className="text-text-secondary mb-6">
                  Be the first to launch a token and take the top spot on the leaderboard!
                </p>
                <Button variant="primary" size="lg" onClick={handleCreateToken}>
                  Launch Your Token
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-background-elevated">
              {leaderboardData.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-6 hover:bg-background-elevated transition-colors"
                >
                  {/* Rank and User Info */}
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${getRankBadge(entry.rank_position)}`}>
                      #{entry.rank_position}
                    </div>
                    
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                      <span className="text-background-dark font-bold text-sm">
                        {getInitials(entry.royalty_earner_social_or_wallet)}
                      </span>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-text-primary text-lg">
                        {entry.royalty_earner_social_or_wallet}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-text-secondary">
                        <span>{entry.royalty_role || 'Creator'}</span>
                        {entry.top_token_symbol && (
                          <span>• Top: {entry.top_token_symbol}</span>
                        )}
                        <span>• {entry.tokens_earned_from} tokens</span>
                      </div>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-mint">
                      {formatCurrency(entry.total_earnings_usd)}
                    </p>
                    <p className="text-text-secondary text-sm">
                      {formatSOL(entry.total_earnings_sol)} • {entry.payout_count} payouts
                    </p>
                    {entry.average_payout_usd && (
                      <p className="text-text-secondary text-xs">
                        Avg: {formatCurrency(entry.average_payout_usd)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
