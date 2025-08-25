'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  DollarSign,
  ArrowUp,
  ArrowDown,
  Globe,
  Twitter,
  MessageCircle,
  BarChart3,
  Clock,
  Activity,
  Eye,
  Heart,
  Share2,
  Flame,
  Zap
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface TokenData {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  bannerUrl?: string;
  twitterUrl?: string;
  websiteUrl: string;
  tokenAddress: string;
  metadataUrl?: string;
  creatorWallet: string;
  initialBuyAmount: number;
  royaltyRecipients: Array<{
    id: string;
    type: 'wallet' | 'social';
    identifier: string;
    percentage: number;
    label: string;
    isManager: boolean;
    role: string;
  }>;
  // Market data
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  transactions: number;
  buyVolume: number;
  sellVolume: number;
  buyers: number;
  sellers: number;
}

interface JupiterTokenData {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  dev: string;
  circSupply: number;
  totalSupply: number;
  tokenProgram: string;
  firstPool: {
    id: string;
    createdAt: string;
  };
  holderCount: number;
  audit: {
    mintAuthorityDisabled: boolean;
    freezeAuthorityDisabled: boolean;
    topHoldersPercentage: number;
    devBalancePercentage: number;
  };
  organicScore: number;
  organicScoreLabel: string;
  isVerified: boolean;
  tags: string[];
  fdv: number;
  mcap: number;
  usdPrice: number;
  priceBlockId: number;
  liquidity: number;
  stats5m: any;
  stats1h: any;
  stats6h: any;
  stats24h: any;
  ctLikes: number;
  smartCtLikes: number;
  updatedAt: string;
}

interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TokenPageProps {
  params: {
    ca: string;
  };
}

const TokenPage: React.FC<TokenPageProps> = ({ params }) => {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [jupiterData, setJupiterData] = useState<JupiterTokenData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<'1m' | '5m' | '15m'>('15m');
  const [chartLoading, setChartLoading] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Fetch token data from Jupiter API
  const fetchJupiterTokenData = async (contractAddress: string) => {
    try {
      // Try direct Jupiter API first, fallback to our proxy if CORS issues
      let response;
      let data;
      
      try {
        response = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${contractAddress}`);
        data = await response.json();
      } catch (corsError) {
        console.log('Direct Jupiter API failed, trying proxy...');
        response = await fetch(`/api/token-data?ca=${contractAddress}`);
        data = await response.json();
      }
      
      if (data && data.length > 0) {
        const tokenInfo = data[0];
        setJupiterData(tokenInfo);
        
        // Update our token data with real market data
        setTokenData(prev => prev ? {
          ...prev,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          imageUrl: tokenInfo.icon,
          price: tokenInfo.usdPrice,
          priceChange24h: tokenInfo.stats24h?.priceChange || 0,
          marketCap: tokenInfo.mcap,
          volume24h: (tokenInfo.stats24h?.buyVolume || 0) + (tokenInfo.stats24h?.sellVolume || 0),
          liquidity: tokenInfo.liquidity,
          holders: tokenInfo.holderCount,
          transactions: (tokenInfo.stats24h?.numBuys || 0) + (tokenInfo.stats24h?.numSells || 0),
          buyVolume: tokenInfo.stats24h?.buyVolume || 0,
          sellVolume: tokenInfo.stats24h?.sellVolume || 0,
          buyers: tokenInfo.stats24h?.numBuys || 0,
          sellers: tokenInfo.stats24h?.numSells || 0
        } : null);
        
        return tokenInfo;
      }
      return null;
    } catch (err) {
      console.error('Error fetching Jupiter token data:', err);
      return null;
    }
  };

    // Fetch chart data using our API route (bypasses CORS)
  const fetchChartData = async (contractAddress: string, interval: string = '1m') => {
    try {
      setChartLoading(true);
      
      // Fetch chart data directly using the contract address
      const url = `/api/chart-data?contractAddress=${contractAddress}&interval=${interval}`;
      console.log('Fetching chart data from API route:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Chart API failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Chart data response:', data);
      
      if (data && data.bars && data.bars.length > 0) {
        const chartPoints: ChartDataPoint[] = data.bars.map((bar: any) => ({
          time: bar.timestamp,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume
        }));
        
        setChartData(chartPoints);
      } else {
        console.log('No chart data available');
        setChartData([]);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoading(true);
        
        const contractAddress = params.ca;
        
        // First, try to get token data from our database
        const dbResponse = await fetch(`/api/token/${contractAddress}`);
        let dbToken = null;
        
        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          if (dbData.success && dbData.token) {
            dbToken = dbData.token;
            console.log('Found token in database:', dbToken);
            
            // Set basic token data from database
            setTokenData({
              name: dbToken.name,
              symbol: dbToken.symbol,
              description: dbToken.description,
              imageUrl: dbToken.image_url,
              bannerUrl: dbToken.banner_url,
              twitterUrl: dbToken.social_link,
              websiteUrl: `https://splitz.fun/token/${contractAddress}`,
              tokenAddress: contractAddress,
              creatorWallet: dbToken.deployer_social_or_wallet,
              initialBuyAmount: 0.01,
              royaltyRecipients: dbToken.ownership?.royalty_earners?.map((earner: any, index: number) => ({
                id: index.toString(),
                type: earner.wallet ? 'wallet' : 'social',
                identifier: earner.wallet || earner.social_or_wallet,
                percentage: earner.percentage,
                label: earner.wallet || earner.social_or_wallet,
                isManager: earner.is_manager || earner.role === 'Management',
                role: earner.role || ''
              })) || [
                {
                  id: '1',
                  type: 'social',
                  identifier: 'X:@splitzdotfun',
                  percentage: 100,
                  label: 'SplitzFun Platform',
                  isManager: true,
                  role: 'Management'
                }
              ],
              // Market data (will be updated by Jupiter)
              price: 1.19,
              priceChange24h: 0,
              marketCap: 0,
              volume24h: 0,
              liquidity: 0,
              holders: 0,
              transactions: 0,
              buyVolume: 0,
              sellVolume: 0,
              buyers: 0,
              sellers: 0
            });
          }
        }
        
        // Then try to enrich with Jupiter data
        const jupiterToken = await fetchJupiterTokenData(contractAddress);
        
        // Always try to fetch chart data if we have Jupiter data with pool address
        if (jupiterToken && jupiterToken.firstPool) {
          await fetchChartData(contractAddress, selectedInterval);
        } else if (dbToken) {
          // If Jupiter fails but we have database data, still try to fetch chart data
          // The fetchChartData function will handle getting the pool address
          await fetchChartData(contractAddress, selectedInterval);
        } else {
          // If no data available, set error
          setError('Token not found or no trading data available');
        }
      } catch (err) {
        setError('Failed to load token data');
        console.error('Error fetching token data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [params.ca]);

  // Update chart when interval changes
  useEffect(() => {
    if (params.ca) {
      fetchChartData(params.ca, selectedInterval);
    }
  }, [selectedInterval, params.ca]);

  // Axiom-style TradingView chart with market cap focus
  const TradingViewChart = () => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(0);
    const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);

    if (chartLoading) {
      return (
        <div className="w-full h-[600px] bg-[#101114] rounded-lg border border-[#2A2E39] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#526FFF] mx-auto mb-4"></div>
            <p className="text-[#787B86] text-sm">Loading chart data...</p>
          </div>
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="w-full h-[600px] bg-[#101114] rounded-lg border border-[#2A2E39] flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-[#526FFF]/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#D1D4DC] mb-2">${tokenData?.symbol || 'TOKEN'} 24h Price Chart</h3>
            <p className="text-[#787B86] text-sm">No chart data available</p>
          </div>
        </div>
      );
    }

    // Axiom-style chart dimensions
    const chartHeight = 600;
    const chartWidth = chartContainerRef.current?.clientWidth || 800;
    const leftPadding = 60;
    const rightPadding = 80; // Space for market cap axis
    const topPadding = 40;
    const bottomPadding = 60;
    const plotWidth = chartWidth - (leftPadding + rightPadding);
    const plotHeight = chartHeight - (topPadding + bottomPadding);

    // Calculate market cap values (price * supply)
    const supply = tokenData?.marketCap ? tokenData.marketCap / tokenData.price : 1000000;
    const marketCaps = chartData.map(d => ({
      ...d,
      marketCap: d.close * supply,
      marketCapOpen: d.open * supply,
      marketCapHigh: d.high * supply,
      marketCapLow: d.low * supply
    }));

    // Zoom and pan calculations
    const visibleCandles = Math.floor(chartData.length / zoom);
    const maxPan = Math.max(0, chartData.length - visibleCandles);
    // Allow panning 50% extra room on both sides
    const adjustedPan = Math.max(-0.5, Math.min(1.5, pan));
    // Use normalized pan for data window, keep overflow for pixel shift
    const panNorm = Math.max(0, Math.min(1, adjustedPan));
    const overflowRatio = adjustedPan - panNorm; // [-0.5, 0.5]
    const startIndex = Math.max(0, Math.min(maxPan, Math.floor(panNorm * maxPan)));
    const endIndex = Math.min(chartData.length, startIndex + visibleCandles);
    const visibleData = marketCaps.slice(startIndex, endIndex);

    // Calculate market cap range based on visible data only (for proper zoom fitting)
    const visibleMarketCapValues = visibleData.map(d => [d.marketCapLow, d.marketCapHigh, d.marketCapOpen, d.marketCap]).flat();
    const minMarketCap = Math.min(...visibleMarketCapValues);
    const maxMarketCap = Math.max(...visibleMarketCapValues);
    const marketCapRange = maxMarketCap - minMarketCap || 1;

    const getY = (marketCap: number) => {
      return topPadding + plotHeight - ((marketCap - minMarketCap) / marketCapRange) * plotHeight;
    };

    const getX = (index: number) => {
      // Shift pixels by overflow so user can see extra space left/right
      return leftPadding + overflowRatio * plotWidth + (index / Math.max(1, visibleData.length - 1)) * plotWidth;
    };

    const formatMarketCap = (value: number) => {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    };

    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp * 1000);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStart(e.clientX);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        // Natural direction: dragging right moves forward in time
        const delta = (e.clientX - dragStart) / plotWidth;
        setPan(prev => {
          const newPan = prev + delta;
          // Allow panning beyond bounds for smooth scrolling
          return Math.max(-0.5, Math.min(1.5, newPan));
        });
        setDragStart(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Clamp pan to 50% extra room on both sides
      setPan(prev => Math.max(-0.5, Math.min(1.5, prev)));
    };

    const handleWheel = (e: React.WheelEvent) => {
      // Only prevent default if we're actually zooming
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.max(0.5, Math.min(5, prev * zoomDelta)));
      }
    };

    return (
      <div 
        className={`w-full h-[600px] bg-[#101114] rounded-lg border border-[#2A2E39] relative overflow-hidden transition-all ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg width={chartWidth} height={chartHeight} className="w-full h-full">
          {/* Axiom-style grid lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
            <line
              key={i}
              x1={leftPadding}
              y1={topPadding + ratio * plotHeight}
              x2={leftPadding + plotWidth}
              y2={topPadding + ratio * plotHeight}
              stroke="#2A2E39"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          ))}
          
          {/* Vertical grid lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
            <line
              key={`v-${i}`}
              x1={leftPadding + ratio * plotWidth}
              y1={topPadding}
              x2={leftPadding + ratio * plotWidth}
              y2={topPadding + plotHeight}
              stroke="#2A2E39"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.3"
            />
          ))}
          
          {/* Axiom-style candlesticks */}
          {visibleData.map((candle, index) => {
            const x = getX(index);
            const openY = getY(candle.marketCapOpen);
            const closeY = getY(candle.marketCap);
            const highY = getY(candle.marketCapHigh);
            const lowY = getY(candle.marketCapLow);
            const isGreen = candle.marketCap >= candle.marketCapOpen;
            const color = isGreen ? '#26a69a' : '#ef5350';
            const candleWidth = Math.max(3, plotWidth / visibleData.length * 0.8);
            
            return (
              <g key={index}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.5"
                />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={Math.min(openY, closeY)}
                  width={candleWidth}
                  height={Math.max(2, Math.abs(closeY - openY))}
                  fill={color}
                  stroke={color}
                  rx="1"
                />
              </g>
            );
          })}
          
          {/* Right-side market cap axis (Axiom style) */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => {
            const marketCap = minMarketCap + (1 - ratio) * marketCapRange;
            return (
              <text
                key={i}
                x={leftPadding + plotWidth + 10}
                y={topPadding + ratio * plotHeight + 4}
                fill="#787B86"
                fontSize="11"
                fontFamily="monospace"
                textAnchor="start"
              >
                {formatMarketCap(marketCap)}
              </text>
            );
          })}
          
          {/* Current market cap line */}
          {tokenData && (
            <g>
              <line
                x1={leftPadding}
                y1={getY(tokenData.marketCap)}
                x2={leftPadding + plotWidth}
                y2={getY(tokenData.marketCap)}
                stroke="#526FFF"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.8"
              />
              <rect
                x={leftPadding + plotWidth + 5}
                y={getY(tokenData.marketCap) - 10}
                width="80"
                height="20"
                fill="#526FFF"
                rx="2"
              />
              <text
                x={leftPadding + plotWidth + 10}
                y={getY(tokenData.marketCap) + 4}
                fill="white"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="600"
              >
                {formatMarketCap(tokenData.marketCap)}
              </text>
            </g>
          )}
          
          {/* Time labels */}
          {visibleData.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const index = Math.floor(ratio * (visibleData.length - 1));
            const candle = visibleData[index];
            if (!candle) return null;
            
            return (
              <text
                key={`time-${i}`}
                x={leftPadding + ratio * plotWidth}
                y={chartHeight - 10}
                fill="#787B86"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {formatTime(candle.time)}
              </text>
            );
          })}
        </svg>
        
        {/* Axiom-style info overlay */}
        <div className="absolute top-4 left-4 bg-[#1E222D]/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
          <div className="flex items-center space-x-4 text-[#D1D4DC]">
            <span>O: {formatMarketCap(marketCaps[0]?.marketCapOpen || 0)}</span>
            <span>H: {formatMarketCap(Math.max(...(marketCaps.map(d => d.marketCapHigh) || [0])))}</span>
            <span>L: {formatMarketCap(Math.min(...(marketCaps.map(d => d.marketCapLow) || [0])))}</span>
            <span>C: {formatMarketCap(marketCaps[marketCaps.length - 1]?.marketCap || 0)}</span>
          </div>
        </div>

        {/* Zoom controls (Axiom style) */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
          <div className="text-xs text-[#787B86] text-center mb-1">Zoom: Ctrl+Scroll</div>
          <div className="text-xs text-[#787B86] text-center mb-1">Pan: Click & Drag</div>
          <div className="flex space-x-2">
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev * 0.9))}
              className="w-8 h-8 bg-[#1E222D] text-[#D1D4DC] rounded flex items-center justify-center hover:bg-[#2A2E39] transition-colors"
              title="Zoom Out"
            >
              <svg width="16" height="16" fill="currentColor">
                <path d="M14 10H4V8.5h10V10Z"/>
              </svg>
            </button>
            <button
              onClick={() => setZoom(prev => Math.min(5, prev * 1.1))}
              className="w-8 h-8 bg-[#1E222D] text-[#D1D4DC] rounded flex items-center justify-center hover:bg-[#2A2E39] transition-colors"
              title="Zoom In"
            >
              <svg width="16" height="16" fill="currentColor">
                <path d="M8.25 13.75v-9.5h1.5v9.5h-1.5Z"/>
                <path d="M13.75 9.75h-9.5v-1.5h9.5v1.5Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(4)}`;
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath="/token" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-mint mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Loading Token Data</h2>
            <p className="text-text-secondary">Please wait while we fetch the token information...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header currentPath="/token" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-4">Token Not Found</h1>
            <p className="text-text-secondary">The token with address {formatAddress(params.ca)} could not be found.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header currentPath="/token" />
      
      <main className="flex-1 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Token Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <img
                  src={tokenData.imageUrl}
                  alt={tokenData.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-primary-mint/20 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary truncate">{tokenData.name}</h1>
                    <span className="text-lg font-bold text-primary-mint flex-shrink-0">
                      ${tokenData.symbol}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                    <span className="flex-shrink-0">Solana • SplitzFun</span>
                    <span className="flex-shrink-0">•</span>
                    <span className="text-text-primary font-mono truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                      {formatAddress(tokenData.tokenAddress)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(tokenData.tokenAddress)}
                      className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Token Information Links */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-3">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-sm text-text-secondary whitespace-nowrap">Contract:</span>
                      <code className="text-sm text-text-primary bg-background-dark px-2 py-1 rounded truncate max-w-[200px] sm:max-w-[150px] md:max-w-[200px] lg:max-w-[250px]">
                        {formatAddress(tokenData.tokenAddress)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tokenData.tokenAddress)}
                        className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-sm text-text-secondary whitespace-nowrap">Creator:</span>
                      <code className="text-sm text-text-primary bg-background-dark px-2 py-1 rounded truncate max-w-[200px] sm:max-w-[150px] md:max-w-[200px] lg:max-w-[250px]">
                        {formatAddress(tokenData.creatorWallet)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tokenData.creatorWallet)}
                        className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-sm text-text-secondary whitespace-nowrap">Links:</span>
                      {tokenData.websiteUrl && (
                        <a
                          href={tokenData.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-background-dark text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <Globe className="w-3 h-3" />
                        </a>
                      )}
                      {tokenData.twitterUrl && (
                        <a
                          href={tokenData.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-background-dark text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <Twitter className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 bg-background-card rounded-xl p-3 sm:p-4 border border-background-elevated">
              <div className="text-center">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Market Cap</p>
                <p className="text-lg font-bold text-text-primary">{formatNumber(tokenData.marketCap)}</p>
                <p className="text-xs text-text-secondary">Rank #42</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary uppercase tracking-wide">24h Volume</p>
                <p className="text-lg font-bold text-text-primary">{formatNumber(tokenData.volume24h)}</p>
                <p className="text-xs text-green-400">+15.3%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Liquidity</p>
                <p className="text-lg font-bold text-text-primary">{formatNumber(tokenData.liquidity)}</p>
                <p className="text-xs text-text-secondary">TVL</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Holders</p>
                <p className="text-lg font-bold text-text-primary">{tokenData.holders.toLocaleString()}</p>
                <p className="text-xs text-green-400">+234 (24h)</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Transactions</p>
                <p className="text-lg font-bold text-text-primary">{tokenData.transactions.toLocaleString()}</p>
                <p className="text-xs text-text-secondary">Total</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* Chart Section - Full Width */}
            <div className="bg-background-card rounded-xl border border-background-elevated p-6">
              {/* Token Information Links at Top */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-[#D1D4DC]">${tokenData?.symbol || 'TOKEN'} 24h Price Chart</h2>
                  <div className="flex items-center space-x-1 bg-[#1E222D] rounded-lg p-1">
                    {(['1m', '5m', '15m'] as const).map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setSelectedInterval(interval)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          selectedInterval === interval
                            ? 'bg-[#526FFF] text-white shadow-sm'
                            : 'text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
                        }`}
                      >
                        {interval === '1m' ? '1 Min' : interval === '5m' ? '5 Min' : '15 Min'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#D1D4DC]">{formatMarketCap(tokenData.marketCap)}</p>
                    <p className={`text-sm font-medium ${tokenData.priceChange24h >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                      {tokenData.priceChange24h >= 0 ? '+' : ''}{tokenData.priceChange24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>



              {/* Chart */}
              <div ref={chartContainerRef}>
                <TradingViewChart />
              </div>
            </div>
          </div>

          {/* Token Details Section */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Token Information */}
            <div className="bg-background-card rounded-xl border border-background-elevated p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Token Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Contract Address</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-sm text-text-primary bg-background-dark px-3 py-2 rounded-lg flex-1 truncate">
                      {tokenData.tokenAddress}
                    </code>
                    <button
                      onClick={() => copyToClipboard(tokenData.tokenAddress)}
                      className="text-text-secondary hover:text-text-primary transition-colors p-2 flex-shrink-0"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-text-secondary">Creator Wallet</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-sm text-text-primary bg-background-dark px-3 py-2 rounded-lg flex-1 truncate">
                      {tokenData.creatorWallet}
                    </code>
                    <button
                      onClick={() => copyToClipboard(tokenData.creatorWallet)}
                      className="text-text-secondary hover:text-text-primary transition-colors p-2 flex-shrink-0"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary">Description</label>
                  <p className="text-text-primary mt-1">{tokenData.description}</p>
                </div>
              </div>
            </div>

            {/* Royalty Distribution */}
            <div className="bg-background-card rounded-xl border border-background-elevated p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Royalty Distribution</h3>
              
              <div className="space-y-3">
                {tokenData.royaltyRecipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-3 bg-background-dark rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-text-primary font-medium">{recipient.label}</span>
                        {recipient.isManager && (
                          <span className="text-xs bg-primary-mint/20 text-primary-mint px-2 py-1 rounded-full">
                            Manager
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{recipient.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary-mint">{recipient.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TokenPage;
