import React from 'react';
import { LeaderboardEntry } from '@/types';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  className?: string;
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  className = '',
}) => {
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

  return (
    <div className={`overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-background-elevated">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Rank</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Earner</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Token</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-text-secondary">Earned</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-elevated">
          {entries.map((entry, index) => (
            <tr
              key={entry.handle}
              className="hover:bg-background-elevated transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${getRankBadge(index)}`}>
                    {getRankIcon(index) || `#${index + 1}`}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div 
                  className="flex items-center space-x-3 cursor-pointer hover:bg-background-dark rounded-lg p-2 transition-colors"
                  onClick={() => handleEarnerClick(entry.handle)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                    <span className="text-background-dark font-bold text-sm">
                      {entry.handle.charAt(1).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{entry.handle}</p>
                    <p className="text-text-secondary text-sm">Earner</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                    <span className="text-background-dark font-bold text-xs">
                      {entry.tokenTicker.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium text-text-primary">{entry.tokenTicker}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div>
                  <p className="text-lg font-bold text-primary-mint">
                    {entry.earnedSOL.toFixed(2)} SOL
                  </p>
                  <p className="text-text-secondary text-sm">
                    This period
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
