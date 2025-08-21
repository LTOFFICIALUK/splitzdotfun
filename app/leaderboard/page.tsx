'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LeaderboardTable from '@/components/ui/LeaderboardTable';
import StatCard from '@/components/ui/StatCard';
import { LeaderboardEntry } from '@/types';
import { Trophy, TrendingUp, Users, DollarSign, Share2, Lightbulb, Users2 } from 'lucide-react';

export default function LeaderboardPage() {
  const [timePeriod, setTimePeriod] = useState<'24h' | '7d' | '30d' | 'all_time'>('all_time');
  const [stats, setStats] = useState([
    {
      icon: <Trophy className="w-6 h-6" />,
      label: 'Total Royalties Earned',
      value: '$0',
      change: 'Loading...',
      changeType: 'neutral' as const,
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      label: 'Total Royalties Distributed',
      value: '$0',
      change: 'Loading...',
      changeType: 'neutral' as const,
    },
    {
      icon: <Users className="w-6 h-6" />,
      label: 'Total Earners',
      value: '0',
      change: 'Loading...',
      changeType: 'neutral' as const,
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      label: 'Top Earner',
      value: 'None',
      change: 'Loading...',
      changeType: 'neutral' as const,
    },
  ]);

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

  // Fetch cached stats for the selected time period
  useEffect(() => {
    const fetchCachedStats = async () => {
      try {
        const response = await fetch(`/api/stats-cache?key=stats_${timePeriod}`);
        const data = await response.json();
        
        if (data.success && data.data[`stats_${timePeriod}`]?.value_json) {
          const periodStats = JSON.parse(data.data[`stats_${timePeriod}`].value_json);
          
          const newStats = [
            {
              icon: <Trophy className="w-6 h-6" />,
              label: 'Total Royalties Earned',
              value: formatCurrency(periodStats.totalEarned),
              change: periodStats.periodLabel,
              changeType: 'positive' as const,
            },
            {
              icon: <Trophy className="w-6 h-6" />,
              label: 'Total Royalties Distributed',
              value: formatCurrency(periodStats.totalDistributed),
              change: periodStats.periodLabel,
              changeType: 'positive' as const,
            },
            {
              icon: <Users className="w-6 h-6" />,
              label: 'Total Earners',
              value: periodStats.totalEarners.toString(),
              change: periodStats.periodLabel,
              changeType: 'positive' as const,
            },
            {
              icon: <DollarSign className="w-6 h-6" />,
              label: 'Top Earner',
              value: periodStats.topEarner,
              change: periodStats.periodLabel,
              changeType: 'neutral' as const,
            },
          ];
          setStats(newStats);
        } else {
          // Fallback to all-time stats if period-specific stats not available
          const fallbackResponse = await fetch('/api/stats-cache?keys=total_royalties_earned,total_royalties_distributed,total_earners,top_earner');
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackData.success) {
            const newStats = [
              {
                icon: <Trophy className="w-6 h-6" />,
                label: 'Total Royalties Earned',
                value: fallbackData.data.total_royalties_earned?.text || '$0',
                change: 'All time',
                changeType: 'positive' as const,
              },
              {
                icon: <Trophy className="w-6 h-6" />,
                label: 'Total Royalties Distributed',
                value: fallbackData.data.total_royalties_distributed?.text || '$0',
                change: 'All time',
                changeType: 'positive' as const,
              },
              {
                icon: <Users className="w-6 h-6" />,
                label: 'Total Earners',
                value: fallbackData.data.total_earners?.text || '0',
                change: 'All time',
                changeType: 'positive' as const,
              },
              {
                icon: <DollarSign className="w-6 h-6" />,
                label: 'Top Earner',
                value: fallbackData.data.top_earner?.text || 'None',
                change: 'All time',
                changeType: 'neutral' as const,
              },
            ];
            setStats(newStats);
          }
        }
      } catch (error) {
        console.error('Error fetching cached stats:', error);
      }
    };

    fetchCachedStats();
  }, [timePeriod]);

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <Header currentPath="/leaderboard" />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-background-card to-background-elevated">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-background-dark rounded-full px-4 py-2 mb-4">
                <Trophy className="w-5 h-5 text-primary-mint" />
                <span className="text-sm font-medium text-text-primary">Royalty Leaderboard</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                Top Royalty Earners
              </h1>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Discover the highest-earning creators and influencers on SplitzFun. See who's leading the royalty revolution.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>

            {/* Time Period Selector */}
            <div className="flex justify-center">
              <div className="bg-background-dark rounded-xl p-1 border border-background-elevated">
                {[
                  { key: '24h', label: '24 Hours' },
                  { key: '7d', label: '7 Days' },
                  { key: '30d', label: '30 Days' },
                  { key: 'all_time', label: 'All Time' }
                ].map((period) => (
                  <button
                    key={period.key}
                    onClick={() => setTimePeriod(period.key as '24h' | '7d' | '30d' | 'all_time')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      timePeriod === period.key
                        ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Leaderboard Table */}
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-background-card rounded-2xl border border-background-elevated overflow-hidden">
              <div className="p-6 border-b border-background-elevated">
                <h2 className="text-2xl font-bold text-text-primary">
                  {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Rankings
                </h2>
                <p className="text-text-secondary mt-1">
                  Top royalty earners for the selected time period
                </p>
              </div>
              
              <LeaderboardTable timePeriod={timePeriod} />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 bg-background-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              How Royalty Delegation Works
            </h3>
            <p className="text-text-secondary text-lg leading-relaxed mb-8">
              Token owners can delegate royalties to community members and influencers who are actively promoting their tokens and driving positive price impact. This creates a fair distribution system that rewards real value creation.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-6 h-6 text-background-dark" />
                </div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">Owner Delegation</h4>
                <p className="text-text-secondary text-sm">
                  Token owners can directly delegate a percentage of royalties to community members, influencers, or content creators who are helping grow their token's ecosystem.
                </p>
              </div>
              
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-6 h-6 text-background-dark" />
                </div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">Community Suggestions</h4>
                <p className="text-text-secondary text-sm">
                  Community members can suggest new royalty earners with evidence of their contributions, impact on token price, and community engagement.
                </p>
              </div>
              
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-4">
                  <Users2 className="w-6 h-6 text-background-dark" />
                </div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">Fair Distribution</h4>
                <p className="text-text-secondary text-sm">
                  Royalties are distributed based on measurable impact: community building, content creation, social media promotion, and positive price influence.
                </p>
              </div>
            </div>

            <div className="mt-8 bg-background-dark rounded-xl p-6 border border-background-elevated">
              <h4 className="text-lg font-semibold text-text-primary mb-3">Why Delegate Royalties?</h4>
              <p className="text-text-secondary text-sm leading-relaxed">
                By delegating royalties to active community members and influencers, token owners create a sustainable ecosystem where everyone is incentivized to contribute positively. This includes social media promotion, content creation, community management, and other activities that drive genuine engagement and price appreciation. The goal is to reward those who are actually helping the token succeed, not just those who own it.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
