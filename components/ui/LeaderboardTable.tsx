import React, { useState, useEffect } from 'react';
import { RoyaltyLeaderboardEntry } from '@/types';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';

interface LeaderboardTableProps {
  timePeriod?: '24h' | '7d' | '30d' | 'all_time';
  className?: string;
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  timePeriod = 'all_time',
  className = '',
}) => {
  const [entries, setEntries] = useState<RoyaltyLeaderboardEntry[]>([]);
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

  // Fetch leaderboard data from cache
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to fetch from cache first
        const cacheResponse = await fetch(`/api/stats-cache?key=leaderboard_${timePeriod}`);
        const cacheData = await cacheResponse.json();
        
        if (cacheData.success && cacheData.data[`leaderboard_${timePeriod}`]?.value_json) {
          // Parse cached leaderboard data
          const cachedEntries = JSON.parse(cacheData.data[`leaderboard_${timePeriod}`].value_json);
          setEntries(cachedEntries);
        } else {
          // Fallback to direct API call
          console.log('Cache miss, fetching from direct API...');
          const response = await fetch(`/api/royalty-leaderboard?period=${timePeriod}&limit=50`);
          const data = await response.json();
          
          if (data.success) {
            setEntries(data.data);
          } else {
            console.error('Failed to fetch leaderboard:', data.error);
            setError(data.error || 'Failed to fetch leaderboard');
            setEntries([]);
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Failed to fetch leaderboard');
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timePeriod]);
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = (index: number) => {
    const rank = index + 1;
    let bgColor = 'bg-background-elevated';
    let textColor = 'text-text-secondary';
    
    if (rank === 1) {
      bgColor = 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      textColor = 'text-background-dark';
    } else if (rank === 2) {
      bgColor = 'bg-gradient-to-r from-gray-300 to-gray-500';
      textColor = 'text-background-dark';
    } else if (rank === 3) {
      bgColor = 'bg-gradient-to-r from-amber-600 to-amber-800';
      textColor = 'text-background-dark';
    }

    return `${bgColor} ${textColor}`;
  };

  const handleEarnerClick = (earner: string) => {
    alert(`Viewing ${earner} profile and earnings history... (This is a stub)`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-mint" />
          <p className="text-text-secondary">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-text-secondary mb-4">Failed to load leaderboard</p>
        <p className="text-text-secondary text-sm">{error}</p>
      </div>
    );
  }

  // Show empty state
  if (entries.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Royalty Earners Yet</h3>
          <p className="text-text-secondary mb-6">
            Launch a token and take the top spot! Be the first to earn royalties from your community.
          </p>
          <button
            onClick={() => window.location.href = '/create'}
            className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Launch Your Token
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-background-elevated">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Rank</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Earner</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Top Token</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-text-secondary">Earned</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-elevated">
          {entries.map((entry, index) => (
            <tr
              key={entry.id}
              className="hover:bg-background-elevated transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${getRankBadge(index)}`}>
                    {getRankIcon(index) || `#${entry.rank_position}`}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div 
                  className="flex items-center space-x-3 cursor-pointer hover:bg-background-dark rounded-lg p-2 transition-colors"
                  onClick={() => handleEarnerClick(entry.royalty_earner_social_or_wallet)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                    <span className="text-background-dark font-bold text-sm">
                      {entry.royalty_earner_social_or_wallet.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{entry.royalty_earner_social_or_wallet}</p>
                    <p className="text-text-secondary text-sm">{entry.payout_count} payouts</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  {entry.top_token_symbol ? (
                    <>
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                        <span className="text-background-dark font-bold text-xs">
                          {entry.top_token_symbol.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-text-primary">{entry.top_token_symbol}</span>
                    </>
                  ) : (
                    <span className="text-text-secondary text-sm">Multiple tokens</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div>
                  <p className="text-lg font-bold text-primary-mint">
                    {formatCurrency(entry.total_earnings_usd)}
                  </p>
                  <p className="text-text-secondary text-sm">
                    {formatSOL(entry.total_earnings_sol)}
                  </p>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
