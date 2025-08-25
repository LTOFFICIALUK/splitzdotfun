'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Gavel, User, TrendingUp } from 'lucide-react';

interface AuctionCardProps {
  auction: {
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
    };
    current_bidder?: {
      username?: string;
      wallet_address: string;
    };
  };
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const formatSOL = (amount: number) => {
    return `${amount.toFixed(3)} SOL`;
  };

  const formatTimeLeft = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Ended';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const isEndingSoon = () => {
    const now = new Date();
    const end = new Date(auction.auction_end);
    const diff = end.getTime() - now.getTime();
    return diff > 0 && diff < 60 * 60 * 1000; // Less than 1 hour
  };

  const isEnded = () => {
    const now = new Date();
    const end = new Date(auction.auction_end);
    return end.getTime() <= now.getTime();
  };

  const getStatusColor = () => {
    if (isEnded()) return 'text-red-600';
    if (isEndingSoon()) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (isEnded()) return 'Ended';
    if (isEndingSoon()) return 'Ending Soon';
    return 'Active';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200">
      <Link href={`/marketplace/auction/${auction.id}`}>
        <div className="p-6 cursor-pointer">
          {/* Token Info */}
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
              {auction.tokens.image_url ? (
                <img 
                  src={auction.tokens.image_url} 
                  alt={auction.tokens.name}
                  className="w-8 h-8 rounded"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {auction.tokens.symbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{auction.tokens.name}</h3>
              <p className="text-sm text-gray-500">{auction.tokens.symbol}</p>
            </div>
          </div>

          {/* Auction Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Gavel className="w-4 h-4 text-purple-600 mr-2" />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-gray-500 mr-1" />
              <span className="text-sm text-gray-600">
                {formatTimeLeft(auction.auction_end)}
              </span>
            </div>
          </div>

          {/* Bid Information */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Starting Bid:</span>
              <span className="text-sm font-medium">{formatSOL(auction.starting_bid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Bid:</span>
              <span className="text-sm font-semibold text-purple-600">
                {formatSOL(auction.current_bid)}
              </span>
            </div>
            {auction.reserve_price && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Reserve Price:</span>
                <span className="text-sm font-medium">{formatSOL(auction.reserve_price)}</span>
              </div>
            )}
          </div>

          {/* Current Bidder */}
          {auction.current_bidder && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Current Bidder:</span>
              <div className="flex items-center">
                <User className="w-3 h-3 text-gray-500 mr-1" />
                <span className="text-sm font-medium">
                  {auction.current_bidder.username || 
                   `${auction.current_bidder.wallet_address.slice(0, 6)}...${auction.current_bidder.wallet_address.slice(-4)}`}
                </span>
              </div>
            </div>
          )}

          {/* Seller */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Seller:</span>
            <div className="flex items-center">
              <User className="w-3 h-3 text-gray-500 mr-1" />
              <span className="text-sm font-medium">
                {auction.profiles.username || 
                 `${auction.profiles.wallet_address.slice(0, 6)}...${auction.profiles.wallet_address.slice(-4)}`}
              </span>
            </div>
          </div>

          {/* Bid Count Indicator */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-gray-600">
                {auction.current_bid > auction.starting_bid ? 'Bidding Active' : 'No bids yet'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
