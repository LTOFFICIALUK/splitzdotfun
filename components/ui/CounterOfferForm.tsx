'use client';

import React, { useState } from 'react';
import { MessageSquare, DollarSign, Send, AlertCircle } from 'lucide-react';

interface CounterOfferFormProps {
  offerId: string;
  originalAmount: number;
  onCounterSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function CounterOfferForm({ 
  offerId, 
  originalAmount, 
  onCounterSuccess, 
  onCancel,
  className = '' 
}: CounterOfferFormProps) {
  const [counterAmount, setCounterAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      setError('Please enter a valid counter amount');
      return;
    }

    const amount = parseFloat(counterAmount);
    if (amount <= originalAmount) {
      setError('Counter offer must be higher than the original offer');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/marketplace/offers/${offerId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseType: 'counter',
          counterAmount: amount,
          responseMessage: message,
          responderUserId: 'current-user-id' // This should come from auth context
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (onCounterSuccess) {
          onCounterSuccess();
        }
      } else {
        setError(result.error || 'Failed to send counter offer');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [
    originalAmount * 1.05, // 5% higher
    originalAmount * 1.10, // 10% higher
    originalAmount * 1.15, // 15% higher
    originalAmount * 1.20, // 20% higher
  ];

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Make Counter Offer</h3>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Original Offer:</p>
        <p className="text-lg font-semibold text-gray-900">{formatSOL(originalAmount)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Counter Amount */}
        <div>
          <label htmlFor="counterAmount" className="block text-sm font-medium text-gray-700 mb-2">
            Counter Amount (SOL)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              id="counterAmount"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              step="0.001"
              min={originalAmount + 0.001}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter counter amount"
              required
            />
          </div>
          {counterAmount && parseFloat(counterAmount) <= originalAmount && (
            <p className="mt-1 text-sm text-red-600">
              Counter offer must be higher than {formatSOL(originalAmount)}
            </p>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Options:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickAmounts.map((amount, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCounterAmount(amount.toFixed(6))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {formatSOL(amount)}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional)
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add a message to your counter offer..."
            maxLength={500}
          />
          <p className="mt-1 text-sm text-gray-500">
            {message.length}/500 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || !counterAmount || parseFloat(counterAmount) <= originalAmount}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Counter Offer
              </>
            )}
          </button>
        </div>
      </form>

      {/* Counter Offer Preview */}
      {counterAmount && parseFloat(counterAmount) > originalAmount && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Counter Offer Preview:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Original Offer:</span>
              <span className="text-blue-900">{formatSOL(originalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Your Counter:</span>
              <span className="text-blue-900 font-semibold">{formatSOL(parseFloat(counterAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Difference:</span>
              <span className="text-blue-900">
                +{formatSOL(parseFloat(counterAmount) - originalAmount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
