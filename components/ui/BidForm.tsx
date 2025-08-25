'use client';

import React, { useState } from 'react';
import Button from './Button';
import { useWallet } from './WalletProvider';
import { Gavel, AlertCircle } from 'lucide-react';

interface BidFormProps {
  auction: {
    id: string;
    current_bid: number;
    reserve_price?: number;
    auction_end: string;
    status: string;
  };
  onBidPlaced: () => void;
  className?: string;
}

export default function BidForm({ auction, onBidPlaced, className = '' }: BidFormProps) {
  const { publicKey, isConnected } = useWallet();
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const minBidIncrement = 0.001; // 0.001 SOL minimum increment
  const currentBid = auction.current_bid;
  const minBid = currentBid + minBidIncrement;

  const isAuctionActive = () => {
    const now = new Date();
    const end = new Date(auction.auction_end);
    return auction.status === 'active' && end.getTime() > now.getTime();
  };

  const validateBid = (amount: number) => {
    if (amount <= currentBid) {
      return `Bid must be higher than current bid (${currentBid} SOL)`;
    }
    
    if (auction.reserve_price && amount < auction.reserve_price) {
      return `Bid must meet reserve price (${auction.reserve_price} SOL)`;
    }

    if (amount < minBid) {
      return `Minimum bid is ${minBid} SOL`;
    }

    return '';
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !publicKey) {
      setError('Please connect your wallet to place a bid');
      return;
    }

    if (!isAuctionActive()) {
      setError('This auction is no longer active');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setError('Please enter a valid bid amount');
      return;
    }

    const validationError = validateBid(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsPlacingBid(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Get user ID from wallet address
      const userId = 'temp-user-id'; // This should be fetched from the database

      const response = await fetch(`/api/marketplace/auctions/${auction.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bidAmount: amount,
          bidderUserId: userId,
          transactionSignature: null // TODO: Add actual transaction signature
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Bid placed successfully!');
        setBidAmount('');
        onBidPlaced();
      } else {
        setError(result.error || 'Failed to place bid');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleQuickBid = (amount: number) => {
    setBidAmount(amount.toString());
  };

  if (!isAuctionActive()) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>This auction has ended</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Place Your Bid</h3>
      
      {!isConnected ? (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">Connect your wallet to place a bid</p>
          <Button variant="primary" size="sm">
            Connect Wallet
          </Button>
        </div>
      ) : (
        <form onSubmit={handleBidSubmit} className="space-y-4">
          {/* Current Bid Display */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Bid:</span>
              <span className="font-semibold text-lg">{currentBid} SOL</span>
            </div>
            {auction.reserve_price && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Reserve Price:</span>
                <span className="font-medium">{auction.reserve_price} SOL</span>
              </div>
            )}
          </div>

          {/* Quick Bid Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Quick Bid:</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickBid(minBid)}
                className="text-xs"
              >
                {minBid} SOL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickBid(minBid + 0.01)}
                className="text-xs"
              >
                {(minBid + 0.01).toFixed(3)} SOL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickBid(minBid + 0.1)}
                className="text-xs"
              >
                {(minBid + 0.1).toFixed(3)} SOL
              </Button>
            </div>
          </div>

          {/* Custom Bid Input */}
          <div>
            <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Bid Amount (SOL):
            </label>
            <input
              type="number"
              id="bidAmount"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              min={minBid}
              step="0.001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={`Minimum: ${minBid} SOL`}
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center">
                <span className="text-sm text-green-600">{success}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            disabled={isPlacingBid || !bidAmount}
            className="w-full flex items-center justify-center"
          >
            {isPlacingBid ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Placing Bid...
              </>
            ) : (
              <>
                <Gavel className="w-4 h-4 mr-2" />
                Place Bid
              </>
            )}
          </Button>

          {/* Bid Requirements */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Minimum bid increment: {minBidIncrement} SOL</p>
            <p>• Bids are final and cannot be cancelled</p>
            <p>• You will be refunded if outbid</p>
          </div>
        </form>
      )}
    </div>
  );
}
