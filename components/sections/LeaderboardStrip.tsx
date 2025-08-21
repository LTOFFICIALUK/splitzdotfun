import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { RoyaltyLeaderboardEntry } from '@/types/royalty-leaderboard';

const LeaderboardStrip: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<RoyaltyLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/royalty-leaderboard?period=7d&limit=5');
        const data = await response.json();
        
        if (data.success) {
          setLeaderboardData(data.data);
        } else {
          console.error('Failed to fetch leaderboard:', data.error);
          setError(data.error || 'Failed to fetch leaderboard data');
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to fetch leaderboard data');
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
              <Loader2 className="w-6 h-6 animate-spin text-primary-mint" />
              <span className="ml-3 text-text-secondary">Loading leaderboard...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-text-secondary mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-sm">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-background-dark" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">No Royalty Earners Yet</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Be the first to launch a token and take the top spot!
                </p>
                <Button variant="primary" size="sm" onClick={() => window.location.href = '/create'}>
                  Launch Token
                </Button>
              </div>
            </div>
          ) : (
            leaderboardData.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 ${
                  index !== leaderboardData.length - 1 
                    ? 'border-b border-background-elevated' 
                    : ''
                } hover:bg-background-elevated transition-colors`}
              >
                {/* Rank and Avatar */}
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    entry.rank_position === 1 
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-background-dark' 
                      : entry.rank_position === 2 
                      ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-background-dark' 
                      : entry.rank_position === 3 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-background-dark' 
                      : 'bg-background-elevated text-text-secondary'
                  }`}>
                    #{entry.rank_position}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                    <span className="text-background-dark font-bold text-sm">
                      {entry.royalty_earner_social_or_wallet.startsWith('@') 
                        ? entry.royalty_earner_social_or_wallet.charAt(1).toUpperCase()
                        : entry.royalty_earner_social_or_wallet.charAt(0).toUpperCase()
                      }
                    </span>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-text-primary">{entry.royalty_earner_social_or_wallet}</p>
                    <p className="text-text-secondary text-sm">
                      {entry.top_token_symbol ? `Top: ${entry.top_token_symbol}` : entry.royalty_role || 'Creator'}
                    </p>
                  </div>
                </div>

                {/* Earnings */}
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-mint">
                    {formatCurrency(entry.total_earnings_usd)}
                  </p>
                  <p className="text-text-secondary text-sm">
                    {formatSOL(entry.total_earnings_sol)} • {entry.payout_count} payouts
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
