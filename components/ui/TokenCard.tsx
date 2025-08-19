import React from 'react';
import { TokenCardProps } from '@/types';
import Button from './Button';

const TokenCard: React.FC<TokenCardProps> = ({
  logo,
  name,
  ticker,
  shortAddress,
  mcap,
  change,
  actions,
}) => {
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

  return (
    <div className="bg-background-card rounded-2xl border border-background-elevated p-4 hover:border-primary-mint/30 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        {/* Token Info */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
            <span className="text-background-dark font-bold text-sm">{ticker?.charAt(0) || '?'}</span>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{name}</h3>
            <p className="text-text-secondary text-sm font-mono">{shortAddress}</p>
          </div>
        </div>
        
        {/* Market Cap */}
        <div className="text-right">
          <p className="font-semibold text-text-primary">{formatMarketCap(mcap)}</p>
          <p className={`text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatChange(change)}
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex space-x-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'secondary'}
            size="sm"
            onClick={action.onClick}
            className="flex-1"
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default TokenCard;
