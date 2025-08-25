'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import BidForm from '@/components/ui/BidForm';
import BidHistory from '@/components/ui/BidHistory';
import { useWallet } from '@/components/ui/WalletProvider';
import { 
  ArrowLeft, 
  Gavel, 
  Clock, 
  User, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

interface Auction {
  id: string;
  starting_bid: number;
  current_bid: number;
  reserve_price?: number;
  auction_start: string;
  auction_end: string;
  status: string;
  tokens: {
    name: string;
    symbol: string;
    contract_address: string;
    image_url?: string;
  };
  profiles: {
    username?: string;
    wallet_address: string;
    profile_image_url?: string;
  };
  current_bidder?: {
    username?: string;
    wallet_address: string;
  };
  winner?: {
    username?: string;
    wallet_address: string;
  };
}

interface Bid {
  id: string;
  bid_amount: number;
  bid_time: string;
  status: 'active' | 'outbid' | 'won' | 'refunded';
  profiles: {
    username?: string;
    wallet_address: string;
    profile_image_url?: string;
  };
}

export default function AuctionDetailPage() {
  const params = useParams();
  const auctionId = params.id as string;
  const { publicKey, isConnected } = useWallet();
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const fetchAuctionDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch auction details and bid history in parallel
        const [auctionResponse, bidsResponse] = await Promise.all([
          fetch(`/api/marketplace/auctions/${auctionId}`),
          fetch(`/api/marketplace/auctions/${auctionId}/bids`)
        ]);

        if (!auctionResponse.ok) {
          throw new Error('Failed to fetch auction details');
        }

        if (!bidsResponse.ok) {
          throw new Error('Failed to fetch bid history');
        }

        const auctionResult = await auctionResponse.json();
        const bidsResult = await bidsResponse.json();

        if (auctionResult.success) {
          setAuction(auctionResult.data);
        } else {
          throw new Error(auctionResult.error || 'Failed to fetch auction');
        }

        if (bidsResult.success) {
          setBids(bidsResult.data || []);
        }
      } catch (err) {
        console.error('Error fetching auction details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch auction details');
      } finally {
        setLoading(false);
      }
    };

    if (auctionId) {
      fetchAuctionDetails();
    }
  }, [auctionId]);

  useEffect(() => {
    if (!auction) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const end = new Date(auction.auction_end);
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const handleBidPlaced = () => {
    // Refresh auction details and bid history
    window.location.reload();
  };

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(3)} SOL`;
  };

  const isAuctionActive = () => {
    if (!auction) return false;
    const now = new Date();
    const end = new Date(auction.auction_end);
    return auction.status === 'active' && end.getTime() > now.getTime();
  };

  const isEndingSoon = () => {
    if (!auction) return false;
    const now = new Date();
    const end = new Date(auction.auction_end);
    const diff = end.getTime() - now.getTime();
    return diff > 0 && diff < 60 * 60 * 1000; // Less than 1 hour
  };

  const isEnded = () => {
    if (!auction) return false;
    const now = new Date();
    const end = new Date(auction.auction_end);
    return end.getTime() <= now.getTime();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/marketplace" />
        <main className="pt-20 pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="h-96 bg-gray-700 rounded-lg mb-6"></div>
                  <div className="h-64 bg-gray-700 rounded-lg"></div>
                </div>
                <div>
                  <div className="h-96 bg-gray-700 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/marketplace" />
        <main className="pt-20 pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-text-primary mb-2">Auction Not Found</h1>
              <p className="text-text-secondary mb-6">{error || 'The auction you are looking for does not exist.'}</p>
              <Link href="/marketplace">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <Header currentPath="/marketplace" />
      
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/marketplace" className="flex items-center text-text-secondary hover:text-text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Auction Header */}
              <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      {auction.tokens.image_url ? (
                        <img 
                          src={auction.tokens.image_url} 
                          alt={auction.tokens.name}
                          className="w-12 h-12 rounded-lg"
                        />
                      ) : (
                        <span className="text-white font-bold text-xl">
                          {auction.tokens.symbol.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-text-primary">{auction.tokens.name}</h1>
                      <p className="text-text-secondary">{auction.tokens.symbol}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <Gavel className="w-5 h-5 text-purple-500" />
                      <span className={`text-sm font-medium ${
                        isEnded() ? 'text-red-500' : 
                        isEndingSoon() ? 'text-orange-500' : 'text-green-500'
                      }`}>
                        {isEnded() ? 'Ended' : isEndingSoon() ? 'Ending Soon' : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-text-secondary" />
                      <span className="text-sm text-text-secondary">{timeLeft}</span>
                    </div>
                  </div>
                </div>

                {/* Auction Stats */}
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-background-elevated">
                  <div className="text-center">
                    <p className="text-sm text-text-secondary">Starting Bid</p>
                    <p className="text-lg font-semibold text-text-primary">{formatSOL(auction.starting_bid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-text-secondary">Current Bid</p>
                    <p className="text-lg font-semibold text-purple-500">{formatSOL(auction.current_bid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-text-secondary">Total Bids</p>
                    <p className="text-lg font-semibold text-text-primary">{bids.length}</p>
                  </div>
                </div>

                {auction.reserve_price && (
                  <div className="mt-4 p-3 bg-background-elevated rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Reserve Price:</span>
                      <span className="font-medium text-text-primary">{formatSOL(auction.reserve_price)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bid History */}
              <BidHistory bids={bids} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Bid Form */}
              <BidForm 
                auction={auction} 
                onBidPlaced={handleBidPlaced}
              />

              {/* Seller Info */}
              <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Seller</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {auction.profiles.profile_image_url ? (
                      <img 
                        src={auction.profiles.profile_image_url} 
                        alt="Seller"
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      {auction.profiles.username || 
                       `${auction.profiles.wallet_address.slice(0, 6)}...${auction.profiles.wallet_address.slice(-4)}`}
                    </p>
                    <p className="text-sm text-text-secondary">Token Owner</p>
                  </div>
                </div>
              </div>

              {/* Current Bidder */}
              {auction.current_bidder && (
                <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Current Bidder</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {auction.current_bidder.username || 
                         `${auction.current_bidder.wallet_address.slice(0, 6)}...${auction.current_bidder.wallet_address.slice(-4)}`}
                      </p>
                      <p className="text-sm text-text-secondary">Leading the auction</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Winner Info */}
              {auction.winner && (
                <div className="bg-background-card rounded-2xl border border-background-elevated p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Winner</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {auction.winner.username || 
                         `${auction.winner.wallet_address.slice(0, 6)}...${auction.winner.wallet_address.slice(-4)}`}
                      </p>
                      <p className="text-sm text-text-secondary">Auction winner</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
