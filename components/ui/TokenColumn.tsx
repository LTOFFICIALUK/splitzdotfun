import React from 'react';
import { Token } from '@/types';
import { Filter, ExternalLink, Search, Globe } from 'lucide-react';

interface TokenColumnProps {
  title: string;
  tokens: Token[];
  icon: string;
  metricValue: string;
  filters: string[];
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  className?: string;
}

const TokenColumn: React.FC<TokenColumnProps> = ({
  title,
  tokens,
  icon,
  metricValue,
  filters,
  selectedFilters,
  onFilterChange,
  className = '',
}) => {
  const handleFilterToggle = (filter: string) => {
    if (selectedFilters.includes(filter)) {
      onFilterChange(selectedFilters.filter(f => f !== filter));
    } else {
      onFilterChange([...selectedFilters, filter]);
    }
  };

  const formatMarketCap = (mcap: number) => {
    if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(1)}M`;
    if (mcap >= 1000) return `$${(mcap / 1000).toFixed(1)}K`;
    return `$${mcap.toFixed(0)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  return (
    <div className={`bg-background-card border border-background-elevated flex flex-col h-full max-h-full ${className}`}>
      {/* Column Header - Simplified */}
      <div className="p-2 border-b border-background-elevated flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button 
            className="p-2 rounded hover:bg-background-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint"
            onClick={() => alert(`Filter options for ${title} (This is a stub)`)}
            aria-label={`Filter ${title}`}
          >
            <Filter className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Token Cards - Scrollable area with explicit height */}
      <div className="flex-1 overflow-y-auto min-h-0 max-h-full scrollbar-hide" style={{ height: 'calc(100vh - 200px)' }}>
        {tokens.map((token) => (
          <div
            key={token.id}
            className="bg-background-dark border-b border-background-elevated p-3 hover:bg-background-elevated transition-all duration-200 cursor-pointer"
            onClick={() => alert(`Viewing ${token.name} details... (This is a stub)`)}
          >
            <div className="flex items-start space-x-2">
              {/* Left Side - Token Image and CA */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-xl">{token.ticker?.charAt(0) || '?'}</span>
                </div>
                <p className="text-xs text-text-secondary font-medium tracking-wide">{token.address}</p>
              </div>

              {/* Center - Token Info and Links */}
              <div className="flex-1 min-w-0">
                {/* Name and Symbol */}
                <div className="flex items-center space-x-2 mb-3">
                  <h3 className="text-sm font-semibold text-text-primary">{token.name}</h3>
                  <span className="text-xs text-text-secondary">{token.ticker}</span>
                </div>

                {/* Links Row */}
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-1 rounded hover:bg-background-elevated transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`View ${token.name} on X (This is a stub)`);
                    }}
                    aria-label="View on X"
                  >
                    <div className="w-3 h-3 bg-text-secondary rounded-sm flex items-center justify-center">
                      <span className="text-background-dark text-xs font-bold">X</span>
                    </div>
                  </button>
                  <button 
                    className="p-1 rounded hover:bg-background-elevated transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Visit ${token.name} website (This is a stub)`);
                    }}
                    aria-label="Visit website"
                  >
                    <Globe className="w-3 h-3 text-text-secondary" />
                  </button>
                  <button 
                    className="p-1 rounded hover:bg-background-elevated transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Search ${token.name} on Solscan (This is a stub)`);
                    }}
                    aria-label="Search on Solscan"
                  >
                    <Search className="w-3 h-3 text-text-secondary" />
                  </button>
                </div>
              </div>

              {/* Right Side - Market Data */}
              <div className="flex-shrink-0 text-right">
                <div className="mb-2">
                  <p className="text-sm font-medium text-yellow-400">
                    <span className="text-xs text-text-secondary mr-1">MC</span>
                    {formatMarketCap(token.mcap)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    <span className="text-xs text-text-secondary mr-1">V</span>
                    {formatVolume(token.mcap * 0.4)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TokenColumn;
