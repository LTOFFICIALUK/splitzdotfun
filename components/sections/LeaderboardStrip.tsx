import React from 'react';
import Button from '../ui/Button';
import { Trophy, ArrowRight } from 'lucide-react';
import { LeaderboardEntry } from '@/types';

const LeaderboardStrip: React.FC = () => {
  // Mock leaderboard data
  const leaderboardEntries: LeaderboardEntry[] = [
    {
      handle: '@memelord',
      avatarUrl: '/images/avatar-meme.png',
      earnedSOL: 3.42,
      tokenTicker: 'FROGZ',
    },
    {
      handle: '@cryptoking',
      avatarUrl: '/images/avatar-crypto.png',
      earnedSOL: 2.89,
      tokenTicker: 'PEPE',
    },
    {
      handle: '@solanaqueen',
      avatarUrl: '/images/avatar-solana.png',
      earnedSOL: 2.15,
      tokenTicker: 'BONK',
    },
    {
      handle: '@degenmaster',
      avatarUrl: '/images/avatar-degen.png',
      earnedSOL: 1.98,
      tokenTicker: 'DOGE',
    },
    {
      handle: '@nftwhale',
      avatarUrl: '/images/avatar-whale.png',
      earnedSOL: 1.76,
      tokenTicker: 'SHIB',
    },
  ];

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
          {leaderboardEntries.map((entry, index) => (
            <div
              key={entry.handle}
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
                  #{index + 1}
                </div>
                
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                  <span className="text-background-dark font-bold text-sm">
                    {entry.handle.charAt(1).toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <p className="font-semibold text-text-primary">{entry.handle}</p>
                  <p className="text-text-secondary text-sm">Token: {entry.tokenTicker}</p>
                </div>
              </div>

              {/* Earnings */}
              <div className="text-right">
                <p className="text-lg font-bold text-primary-mint">
                  {entry.earnedSOL.toFixed(2)} SOL
                </p>
                <p className="text-text-secondary text-sm">
                  This week
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LeaderboardStrip;
