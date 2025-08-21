import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { RoyaltyLeaderboardEntry } from '@/types';

const LeaderboardStrip: React.FC = () => {
  const [leaderboardEntries, setLeaderboardEntries] = useState<RoyaltyLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Fetch leaderboard data for the strip (top 5 all-time) from cache
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        
        // Try to fetch from cache first
        const cacheResponse = await fetch('/api/stats-cache?key=leaderboard_all_time');
        const cacheData = await cacheResponse.json();
        
        if (cacheData.success && cacheData.data.leaderboard_all_time?.value_json) {
          // Parse cached leaderboard data and take top 5
          const cachedEntries = JSON.parse(cacheData.data.leaderboard_all_time.value_json);
          setLeaderboardEntries(cachedEntries.slice(0, 5));
        } else {
          // Fallback to direct API call
          console.log('Cache miss, fetching from direct API...');
          const response = await fetch('/api/royalty-leaderboard?period=all_time&limit=5');
          const data = await response.json();
          
          if (data.success) {
            setLeaderboardEntries(data.data);
          } else {
            console.error('Failed to fetch leaderboard:', data.error);
            setLeaderboardEntries([]);
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const handleViewLeaderboard = () => {
    window.location.href = '/leaderboard';
  };

  return (
    <section className="py-16 bg-background-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
              <Trophy className="w-5 h-5 text-background-dark" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
                Top Royalty Earners
              </h2>
              <p className="text-text-secondary">
                This week's highest earning creators
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewLeaderboard}
            className="flex items-center"
          >
            See full leaderboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Leaderboard Entries */}
        <div className="bg-background-dark rounded-2xl border border-background-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-mint" />
                <p className="text-text-secondary">Loading leaderboard...</p>
              </div>
            </div>
          ) : leaderboardEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No Royalty Earners Yet</h3>
                <p className="text-text-secondary mb-4">
                  Launch a token and take the top spot!
                </p>
                <button
                  onClick={() => window.location.href = '/create'}
                  className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
                >
                  Launch Your Token
                </button>
              </div>
            </div>
          ) : (
            leaderboardEntries.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 ${
                  index !== leaderboardEntries.length - 1 
                    ? 'border-b border-background-elevated' 
                    : ''
                } hover:bg-background-elevated transition-colors`}
              >
                {/* Rank and Avatar */}
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-background-dark' 
                      : index === 1 
                      ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-background-dark' 
                      : index === 2 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-background-dark' 
                      : 'bg-background-elevated text-text-secondary'
                  }`}>
                    #{entry.rank_position}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                    <span className="text-background-dark font-bold text-sm">
                      {entry.royalty_earner_social_or_wallet.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-text-primary">{entry.royalty_earner_social_or_wallet}</p>
                    <p className="text-text-secondary text-sm">
                      {entry.top_token_symbol ? entry.top_token_symbol : 'Multiple tokens'}
                    </p>
                  </div>
                </div>

                {/* Earnings */}
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-mint">
                    {formatCurrency(entry.total_earnings_usd)}
                  </p>
                  <p className="text-text-secondary text-sm">
                    {entry.payout_count} payouts
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default LeaderboardStrip;
