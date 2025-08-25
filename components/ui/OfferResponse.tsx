'use client';

import React, { useState } from 'react';
import Button from './Button';
import { CheckCircle, X, TrendingUp, MessageSquare, AlertCircle } from 'lucide-react';

interface OfferResponseProps {
  offer: {
    id: string;
    offer_amount: number;
    offer_message?: string;
    status: string;
    expires_at: string;
    profiles: {
      username?: string;
      wallet_address: string;
    };
  };
  listingPrice: number;
  onResponseSubmitted: () => void;
  className?: string;
}

export default function OfferResponse({ offer, listingPrice, onResponseSubmitted, className = '' }: OfferResponseProps) {
  const [responseType, setResponseType] = useState<'accept' | 'reject' | 'counter'>('accept');
  const [counterAmount, setCounterAmount] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(3)} SOL`;
  };

  const isOfferExpired = () => {
    const now = new Date();
    const expires = new Date(offer.expires_at);
    return expires.getTime() <= now.getTime();
  };

  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isOfferExpired()) {
      setError('This offer has expired');
      return;
    }

    if (responseType === 'counter' && (!counterAmount || parseFloat(counterAmount) <= 0)) {
      setError('Please enter a valid counter amount');
      return;
    }

    if (responseType === 'counter' && parseFloat(counterAmount) <= offer.offer_amount) {
      setError('Counter amount must be higher than the original offer');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Get user ID from wallet address
      const userId = 'temp-user-id'; // This should be fetched from the database

      const response = await fetch(`/api/marketplace/offers/${offer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseType: responseType,
          counterAmount: responseType === 'counter' ? parseFloat(counterAmount) : null,
          responseMessage: responseMessage.trim() || null,
          responderUserId: userId
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Offer ${responseType}ed successfully!`);
        onResponseSubmitted();
      } else {
        setError(result.error || 'Failed to respond to offer');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickCounter = (percentage: number) => {
    const amount = listingPrice * (percentage / 100);
    setCounterAmount(amount.toFixed(3));
  };

  if (isOfferExpired()) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>This offer has expired</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Respond to Offer</h3>
      
      {/* Offer Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Offer Amount:</span>
          <span className="font-semibold text-lg text-purple-600">
            {formatSOL(offer.offer_amount)}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Listing Price:</span>
          <span className="font-medium">{formatSOL(listingPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Buyer:</span>
          <span className="font-medium">
            {offer.profiles.username || 
             `${offer.profiles.wallet_address.slice(0, 6)}...${offer.profiles.wallet_address.slice(-4)}`}
          </span>
        </div>
        {offer.offer_message && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-start space-x-2">
              <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{offer.offer_message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleResponseSubmit} className="space-y-4">
        {/* Response Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Choose Response:</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setResponseType('accept')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                responseType === 'accept'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Accept</span>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setResponseType('reject')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                responseType === 'reject'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Reject</span>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setResponseType('counter')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                responseType === 'counter'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Counter</span>
              </div>
            </button>
          </div>
        </div>

        {/* Counter Offer Input */}
        {responseType === 'counter' && (
          <div className="space-y-4">
            {/* Quick Counter Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quick Counter:</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCounter(95)}
                  className="text-xs"
                >
                  95% ({formatSOL(listingPrice * 0.95)})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCounter(97)}
                  className="text-xs"
                >
                  97% ({formatSOL(listingPrice * 0.97)})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCounter(99)}
                  className="text-xs"
                >
                  99% ({formatSOL(listingPrice * 0.99)})
                </Button>
              </div>
            </div>

            {/* Custom Counter Amount */}
            <div>
              <label htmlFor="counterAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Counter Amount (SOL):
              </label>
              <input
                type="number"
                id="counterAmount"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                min={offer.offer_amount + 0.001}
                max={listingPrice}
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={`Min: ${formatSOL(offer.offer_amount + 0.001)}`}
                required
              />
            </div>
          </div>
        )}

        {/* Response Message */}
        <div>
          <label htmlFor="responseMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional):
          </label>
          <textarea
            id="responseMessage"
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={`Add a message to the buyer...`}
          />
          <div className="text-xs text-gray-500 mt-1">
            {responseMessage.length}/500 characters
          </div>
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
          disabled={isSubmitting || (responseType === 'counter' && !counterAmount)}
          className="w-full flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              {responseType === 'accept' && <CheckCircle className="w-4 h-4 mr-2" />}
              {responseType === 'reject' && <X className="w-4 h-4 mr-2" />}
              {responseType === 'counter' && <TrendingUp className="w-4 h-4 mr-2" />}
              {responseType.charAt(0).toUpperCase() + responseType.slice(1)} Offer
            </>
          )}
        </Button>

        {/* Response Requirements */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Counter offers must be higher than the original offer</p>
          <p>• Buyer will be notified of your response</p>
          <p>• Accepted offers will proceed to payment</p>
        </div>
      </form>
    </div>
  );
}
