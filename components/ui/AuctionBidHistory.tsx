'use client';

import React, { useState, useEffect } from 'react';
import BidHistory from './BidHistory';

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

interface AuctionBidHistoryProps {
  auctionId: string;
  className?: string;
}

export default function AuctionBidHistory({ auctionId, className = '' }: AuctionBidHistoryProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBids = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/marketplace/auctions/${auctionId}/bids`);
      const result = await response.json();

      if (result.success) {
        setBids(result.data);
      } else {
        setError(result.error || 'Failed to fetch bids');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
  }, [auctionId]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Bid History</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading bids...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Bid History</h3>
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
          <button
            onClick={fetchBids}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <BidHistory bids={bids} className={className} />;
}
