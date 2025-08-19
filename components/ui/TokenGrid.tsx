import React from 'react';
import TokenCard from './TokenCard';
import { Token } from '@/types';

interface TokenGridProps {
  tokens: Token[];
  className?: string;
}

const TokenGrid: React.FC<TokenGridProps> = ({
  tokens,
  className = '',
}) => {
  const handleViewToken = (tokenId: string) => {
    alert(`Viewing token ${tokenId}... (This is a stub)`);
  };

  const handleBuyToken = (tokenId: string) => {
    alert(`Buying token ${tokenId}... (This is a stub)`);
  };

  const handleBoostToken = (tokenId: string) => {
    alert(`Boosting token ${tokenId}... (This is a stub)`);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {tokens.map((token) => (
        <TokenCard
          key={token.id}
          logo={token.logoUrl}
          name={token.name}
          ticker={token.ticker}
          shortAddress={token.address}
          mcap={token.mcap}
          change={token.change24h}
          actions={[
            {
              label: 'View',
              onClick: () => handleViewToken(token.id),
              variant: 'ghost' as const,
            },
            {
              label: 'Buy',
              onClick: () => handleBuyToken(token.id),
              variant: 'primary' as const,
            },
            {
              label: 'Boost',
              onClick: () => handleBoostToken(token.id),
              variant: 'secondary' as const,
            },
          ]}
        />
      ))}
    </div>
  );
};

export default TokenGrid;
