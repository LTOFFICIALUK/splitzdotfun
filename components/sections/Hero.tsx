import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { ArrowRight, Play, Loader2 } from 'lucide-react';

interface HeroProps {
  headline: string;
  subhead: string;
  onPrimaryCTA: () => void;
  onSecondaryCTA: () => void;
}

const Hero: React.FC<HeroProps> = ({
  headline,
  subhead,
  onPrimaryCTA,
  onSecondaryCTA,
}) => {
  const [royaltiesDistributed, setRoyaltiesDistributed] = useState<number>(0);
  const [isLoadingRoyalties, setIsLoadingRoyalties] = useState<boolean>(true);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(true);
  const [totalHolders, setTotalHolders] = useState<number>(0);
  const [isLoadingHolders, setIsLoadingHolders] = useState<boolean>(true);

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

  // Helper function to format numbers (for holders, tokens, etc.)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toLocaleString();
    }
  };

  // Fetch all stats from cache
  useEffect(() => {
    const fetchCachedStats = async () => {
      try {
        const response = await fetch('/api/stats-cache?keys=total_royalties_claimed_usd,total_tokens_launched,total_active_holders');
        const data = await response.json();
        
        if (data.success) {
          // Set royalties distributed
          if (data.data.total_royalties_claimed_usd) {
            setRoyaltiesDistributed(data.data.total_royalties_claimed_usd.numeric || 0);
          }
          
          // Set token count
          if (data.data.total_tokens_launched) {
            setTokenCount(data.data.total_tokens_launched.numeric || 0);
          }
          
          // Set total holders
          if (data.data.total_active_holders) {
            setTotalHolders(data.data.total_active_holders.numeric || 0);
          }
        } else {
          console.error('Failed to fetch cached stats:', data.error);
          // Fallback to individual API calls if cache fails
          fetchFallbackStats();
        }
      } catch (error) {
        console.error('Error fetching cached stats:', error);
        // Fallback to individual API calls if cache fails
        fetchFallbackStats();
      } finally {
        setIsLoadingRoyalties(false);
        setIsLoadingTokens(false);
        setIsLoadingHolders(false);
      }
    };

    const fetchFallbackStats = async () => {
      try {
        // Fetch royalties distributed
        const royaltiesResponse = await fetch('/api/royalties-distributed');
        const royaltiesData = await royaltiesResponse.json();
        if (royaltiesData.success) {
          setRoyaltiesDistributed(royaltiesData.total_distributed_usd);
        }

        // Fetch token count
        const tokenResponse = await fetch('/api/token-count');
        const tokenData = await tokenResponse.json();
        if (tokenData.success) {
          setTokenCount(tokenData.total_tokens);
        }

        // Fetch total holders
        const holdersResponse = await fetch('/api/total-holders');
        const holdersData = await holdersResponse.json();
        if (holdersData.success) {
          setTotalHolders(holdersData.total_holders);
        }
      } catch (error) {
        console.error('Error fetching fallback stats:', error);
      }
    };

    fetchCachedStats();
  }, []);
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-mint rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-aqua rounded-full blur-3xl"></div>
      </div>

      {/* Split Pattern */}
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 1200 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 400 L400 200 L800 600 L1200 400"
            stroke="url(#splitGradient)"
            strokeWidth="2"
            strokeDasharray="10 10"
            opacity="0.1"
          />
          <defs>
            <linearGradient id="splitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6BFFB5" />
              <stop offset="100%" stopColor="#2DE2E6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-text-primary mb-6 leading-tight">
          <span className="bg-gradient-to-r from-primary-mint to-primary-aqua bg-clip-text text-transparent">
            {headline}
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-xl md:text-2xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed">
          {subhead}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Button
            variant="primary"
            size="lg"
            onClick={onPrimaryCTA}
            className="w-full sm:w-auto text-lg px-8 py-4"
          >
            Create coin
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={onSecondaryCTA}
            className="w-full sm:w-auto text-lg px-8 py-4"
          >
            <Play className="w-5 h-5 mr-2" />
            How it works
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-mint mb-2">
              {isLoadingRoyalties ? (
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              ) : (
                formatCurrency(royaltiesDistributed)
              )}
            </div>
            <div className="text-text-secondary">Total Royalties Claimed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-aqua mb-2">
              {isLoadingTokens ? (
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              ) : (
                tokenCount.toLocaleString()
              )}
            </div>
            <div className="text-text-secondary">Tokens Launched</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-mint mb-2">
              {isLoadingHolders ? (
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              ) : (
                formatNumber(totalHolders)
              )}
            </div>
            <div className="text-text-secondary">Active Holders</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-text-secondary rounded-full flex justify-center">
          <div className="w-1 h-3 bg-text-secondary rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
