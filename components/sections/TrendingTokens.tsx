import React, { useState, useEffect } from 'react';
import TokenCard from '../ui/TokenCard';
import Button from '../ui/Button';
import { TrendingUp, Zap, ArrowRight, Loader2, Users } from 'lucide-react';
import { Token } from '@/types';

const TrendingTokens: React.FC = () => {
  const [trendingTokens, setTrendingTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    } else {
      return num.toFixed(1);
    }
  };

  // Helper function to format holder count (whole numbers)
  const formatHolderCount = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    } else {
      return Math.round(num).toString();
    }
  };

  // Helper function to truncate contract address
  const truncateAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  useEffect(() => {
    const fetchTrendingTokens = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/trending-tokens?limit=5');
        const data = await response.json();
        
        if (data.success) {
          setTrendingTokens(data.data);
        } else {
          setError('Failed to fetch trending tokens');
        }
      } catch (err) {
        setError('Error loading trending tokens');
        console.error('Error fetching trending tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingTokens();
  }, []);

  const handleBoost = (tokenId: string) => {
    alert(`Boosting ${tokenId}... (This is a stub)`);
  };

  const handleViewAll = () => {
    window.location.href = '/explore';
  };

  return (
    <section className="py-20 bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-12">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-background-dark" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
                Trending Tokens
              </h2>
              <p className="text-text-secondary">
                Hot tokens gaining momentum on SplitzFun
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAll}
            className="flex items-center"
          >
            View all
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Horizontal Scrolling Cards */}
        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-mint" />
              <span className="ml-3 text-text-secondary">Loading trending tokens...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-red-400">{error}</span>
            </div>
          ) : trendingTokens.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-text-secondary">No trending tokens available</span>
            </div>
          ) : (
                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              {trendingTokens.map((token) => (
                <div key={token.id} className="flex-shrink-0 w-full sm:w-80 max-w-sm">
                  <div className="bg-background-card rounded-2xl border border-background-elevated p-4 sm:p-6 hover:border-primary-mint/30 transition-all duration-200 h-full">
                    {/* Token Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center flex-shrink-0">
                          <span className="text-background-dark font-bold text-sm">{token.ticker.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary truncate">{token.name}</h3>
                          <p className="text-text-secondary text-sm font-mono">{truncateAddress(token.address)}</p>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center justify-end space-x-1 mb-1">
                          <Users className="w-4 h-4 text-text-secondary" />
                          <p className="font-semibold text-text-primary">
                            {formatHolderCount(token.holder_count || 0)}
                          </p>
                        </div>
                        <p className={`text-sm font-medium ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Market Cap Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-text-secondary mb-1">
                        <span>Market Cap</span>
                        <span>${formatNumber(token.mcap)}</span>
                      </div>
                      <div className="w-full bg-background-elevated rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-primary-mint to-primary-aqua h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((token.mcap / 15000000) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Boost Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleBoost(token.id)}
                      className="w-full flex items-center justify-center"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Boost
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Gradient Fade Edges */}
          <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background-dark to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background-dark to-transparent pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
};

export default TrendingTokens;
