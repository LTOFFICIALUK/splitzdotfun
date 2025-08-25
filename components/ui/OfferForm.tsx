'use client';

import React, { useState } from 'react';
import Button from './Button';
import { useWallet } from './WalletProvider';
import { MessageSquare, Clock, AlertCircle } from 'lucide-react';

interface OfferFormProps {
  listing: {
    id: string;
    listing_price: number;
    tokens: {
      name: string;
      symbol: string;
    };
  };
  onOfferCreated: () => void;
  className?: string;
}

export default function OfferForm({ listing, onOfferCreated, className = '' }: OfferFormProps) {
  const { publicKey, isConnected } = useWallet();
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(3)} SOL`;
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !publicKey) {
      setError('Please connect your wallet to make an offer');
      return;
    }

    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid offer amount');
      return;
    }

    if (amount >= listing.listing_price) {
      setError('Offer amount must be less than the listing price');
      return;
    }

    setIsCreatingOffer(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Get user ID from wallet address
      const userId = 'temp-user-id'; // This should be fetched from the database

      const response = await fetch('/api/marketplace/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: listing.id,
          offerAmount: amount,
          offerMessage: offerMessage.trim() || null,
          buyerUserId: userId,
          expiresInHours: expiresInHours
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Offer created successfully!');
        setOfferAmount('');
        setOfferMessage('');
        onOfferCreated();
      } else {
        setError(result.error || 'Failed to create offer');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const handleQuickOffer = (percentage: number) => {
    const amount = listing.listing_price * (percentage / 100);
    setOfferAmount(amount.toFixed(3));
  };

  if (!isConnected) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Make an Offer</h3>
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">Connect your wallet to make an offer</p>
          <Button variant="primary" size="sm">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Make an Offer</h3>
      
      <form onSubmit={handleOfferSubmit} className="space-y-4">
        {/* Listing Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Listing Price:</span>
            <span className="font-semibold text-lg">{formatSOL(listing.listing_price)}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {listing.tokens.name} ({listing.tokens.symbol})
          </div>
        </div>

        {/* Quick Offer Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Quick Offers:</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickOffer(80)}
              className="text-xs"
            >
              80% ({formatSOL(listing.listing_price * 0.8)})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickOffer(85)}
              className="text-xs"
            >
              85% ({formatSOL(listing.listing_price * 0.85)})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickOffer(90)}
              className="text-xs"
            >
              90% ({formatSOL(listing.listing_price * 0.9)})
            </Button>
          </div>
        </div>

        {/* Custom Offer Input */}
        <div>
          <label htmlFor="offerAmount" className="block text-sm font-medium text-gray-700 mb-2">
            Your Offer Amount (SOL):
          </label>
          <input
            type="number"
            id="offerAmount"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            min="0.001"
            max={listing.listing_price - 0.001}
            step="0.001"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={`Max: ${formatSOL(listing.listing_price - 0.001)}`}
            required
          />
        </div>

        {/* Offer Message */}
        <div>
          <label htmlFor="offerMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional):
          </label>
          <textarea
            id="offerMessage"
            value={offerMessage}
            onChange={(e) => setOfferMessage(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Add a message to the seller..."
          />
          <div className="text-xs text-gray-500 mt-1">
            {offerMessage.length}/500 characters
          </div>
        </div>

        {/* Expiration Time */}
        <div>
          <label htmlFor="expiresInHours" className="block text-sm font-medium text-gray-700 mb-2">
            Offer Expires In:
          </label>
          <select
            id="expiresInHours"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>1 week</option>
          </select>
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
          type="submit"
          variant="primary"
          size="lg"
          disabled={isCreatingOffer || !offerAmount}
          className="w-full flex items-center justify-center"
        >
          {isCreatingOffer ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Offer...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              Make Offer
            </>
          )}
        </Button>

        {/* Offer Requirements */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Offer must be less than listing price</p>
          <p>• Seller can accept, reject, or counter your offer</p>
          <p>• Offer expires automatically if not responded to</p>
          <p>• You can only have one pending offer per listing</p>
        </div>
      </form>
    </div>
  );
}
