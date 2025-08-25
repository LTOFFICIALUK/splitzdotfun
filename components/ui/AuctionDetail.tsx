'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, TrendingUp, Award, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import BidForm from './BidForm';
import BidHistory from './BidHistory';
import AuctionTimer from './AuctionTimer';
import AuctionStatus from './AuctionStatus';

interface AuctionDetailProps {
  auctionId: string;
  className?: string;
}

interface Auction {
  id: string;
  token_id: string;
  seller_user_id: string;
  starting_bid: number;
  reserve_price?: number;
  current_bid: number;
  auction_start: string;
  auction_end: string;
  status: 'active' | 'ended' | 'sold' | 'cancelled';
  winner_user_id?: string;
  winning_bid?: number;
  tokens: {
    id: string;
    name: string;
    symbol: string;
    contract_address: string;
    image_url?: string;
  };
  profiles: {
    id: string;
    wallet_address: string;
    username: string;
    profile_image_url?: string;
  };
  current_bidder?: {
    id: string;
    wallet_address: string;
    username: string;
  };
  winner?: {
    id: string;
    wallet_address: string;
    username: string;
  };
}

export default function AuctionDetail({ auctionId, className = '' }: AuctionDetailProps) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAuction = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/marketplace/auctions/${auctionId}`);
      const result = await response.json();

      if (result.success) {
        setAuction(result.data);
      } else {
        setError(result.error || 'Failed to fetch auction');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuction();
  }, [auctionId]);

  const handleBidSuccess = () => {
    setRefreshKey(prev => prev + 1);
    fetchAuction();
  };

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeLeft = () => {
    if (!auction) return 0;
    const now = new Date().getTime();
    const end = new Date(auction.auction_end).getTime();
    return Math.max(0, end - now);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <button 
            onClick={fetchAuction}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-600">
          <p>Auction not found</p>
        </div>
      </div>
    );
  }

  const isActive = auction.status === 'active' && getTimeLeft() > 0;
  const hasWinner = auction.status === 'sold' && auction.winner_user_id;

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{auction.tokens.name} Auction</h1>
          <AuctionStatus status={auction.status} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm">Current Bid: {formatSOL(auction.current_bid)}</span>
          </div>
          
          {auction.reserve_price && (
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span className="text-sm">Reserve: {formatSOL(auction.reserve_price)}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span className="text-sm">Seller: {auction.profiles.username}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Token Info */}
        <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
          {auction.tokens.image_url && (
            <img 
              src={auction.tokens.image_url} 
              alt={auction.tokens.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">{auction.tokens.name} ({auction.tokens.symbol})</h2>
            <p className="text-gray-600 text-sm">{auction.tokens.contract_address}</p>
          </div>
        </div>

        {/* Auction Timer */}
        <div className="mb-6">
          <AuctionTimer 
            endTime={auction.auction_end}
            isActive={isActive}
            onTimeUp={() => setRefreshKey(prev => prev + 1)}
          />
        </div>

        {/* Current Bid Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Current Bid</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{formatSOL(auction.current_bid)}</p>
              {auction.current_bidder && (
                <p className="text-sm text-gray-600">by {auction.current_bidder.username}</p>
              )}
            </div>
            {auction.reserve_price && auction.current_bid < auction.reserve_price && (
              <div className="text-orange-600 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Reserve not met
              </div>
            )}
          </div>
        </div>

        {/* Winner Info */}
        {hasWinner && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Auction Won!</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-green-600">{formatSOL(auction.winning_bid!)}</p>
                <p className="text-sm text-gray-600">by {auction.winner?.username}</p>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(auction.auction_end)}
              </div>
            </div>
          </div>
        )}

        {/* Auction Cancelled */}
        {auction.status === 'cancelled' && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800">Auction Cancelled</h3>
            </div>
          </div>
        )}

        {/* Bid Form */}
        {isActive && (
          <div className="mb-6">
            <BidForm 
              auctionId={auctionId}
              currentBid={auction.current_bid}
              reservePrice={auction.reserve_price}
              onBidSuccess={handleBidSuccess}
            />
          </div>
        )}

        {/* Auction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Auction Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Starting Bid:</span>
                <span>{formatSOL(auction.starting_bid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Started:</span>
                <span>{formatDate(auction.auction_start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ends:</span>
                <span>{formatDate(auction.auction_end)}</span>
              </div>
              {auction.reserve_price && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reserve Price:</span>
                  <span>{formatSOL(auction.reserve_price)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Seller Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Username:</span>
                <span>{auction.profiles.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wallet:</span>
                <span className="font-mono text-xs">
                  {auction.profiles.wallet_address.slice(0, 8)}...{auction.profiles.wallet_address.slice(-6)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bid History */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Bid History</h3>
          <BidHistory auctionId={auctionId} key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
