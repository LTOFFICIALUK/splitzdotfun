'use client';

import React from 'react';
import { User, Clock, TrendingUp, TrendingDown } from 'lucide-react';

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

interface BidHistoryProps {
  bids: Bid[];
  className?: string;
}

export default function BidHistory({ bids, className = '' }: BidHistoryProps) {
  const formatSOL = (amount: number) => {
    return `${amount.toFixed(3)} SOL`;
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'outbid':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'won':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'refunded':
        return <TrendingDown className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Current Bid';
      case 'outbid':
        return 'Outbid';
      case 'won':
        return 'Winning Bid';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'outbid':
        return 'text-red-600 bg-red-50';
      case 'won':
        return 'text-purple-600 bg-purple-50';
      case 'refunded':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (bids.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Bid History</h3>
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No bids yet</p>
          <p className="text-sm">Be the first to place a bid!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Bid History</h3>
        <p className="text-sm text-gray-600 mt-1">
          {bids.length} bid{bids.length !== 1 ? 's' : ''} placed
        </p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {bids.map((bid, index) => (
          <div key={bid.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              {/* Bidder Info */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  {bid.profiles.profile_image_url ? (
                    <img 
                      src={bid.profiles.profile_image_url} 
                      alt="Profile"
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {bid.profiles.username || 
                     `${bid.profiles.wallet_address.slice(0, 6)}...${bid.profiles.wallet_address.slice(-4)}`}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formatTime(bid.bid_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bid Amount and Status */}
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-lg">
                    {formatSOL(bid.bid_amount)}
                  </span>
                  {getStatusIcon(bid.status)}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(bid.status)}`}>
                  {getStatusText(bid.status)}
                </span>
              </div>
            </div>

            {/* Bid Position */}
            {index === 0 && bid.status === 'active' && (
              <div className="mt-2 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  Current highest bid
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total Bids:</span>
          <span className="font-medium">{bids.length}</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-gray-600">Highest Bid:</span>
          <span className="font-semibold text-green-600">
            {bids.length > 0 ? formatSOL(bids[0].bid_amount) : '0 SOL'}
          </span>
        </div>
      </div>
    </div>
  );
}
