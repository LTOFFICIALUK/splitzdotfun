'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, MessageSquare, DollarSign, User } from 'lucide-react';

interface OfferHistoryProps {
  listingId: string;
  className?: string;
}

interface Offer {
  id: string;
  offer_amount: number;
  offer_message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  created_at: string;
  expires_at: string;
  buyer_user_id: string;
  profiles: {
    id: string;
    username: string;
    wallet_address: string;
    profile_image_url?: string;
  };
  offer_responses?: Array<{
    id: string;
    response_type: 'accept' | 'reject' | 'counter';
    counter_amount?: number;
    response_message?: string;
    created_at: string;
    responder_user_id: string;
    profiles: {
      id: string;
      username: string;
    };
  }>;
}

export default function OfferHistory({ listingId, className = '' }: OfferHistoryProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/marketplace/listings/${listingId}/offers`);
      const result = await response.json();

      if (result.success) {
        setOffers(result.data);
      } else {
        setError(result.error || 'Failed to fetch offers');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [listingId]);

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        };
      case 'accepted':
        return {
          icon: CheckCircle,
          label: 'Accepted',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'rejected':
        return {
          icon: XCircle,
          label: 'Rejected',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        };
      case 'countered':
        return {
          icon: MessageSquare,
          label: 'Countered',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        };
      case 'expired':
        return {
          icon: Clock,
          label: 'Expired',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={fetchOffers}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-600">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No offers yet</p>
          <p className="text-sm text-gray-500">Be the first to make an offer!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Offer History</h3>
        <p className="text-sm text-gray-600">{offers.length} offer{offers.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {offers.map((offer) => {
          const statusConfig = getStatusConfig(offer.status);
          const StatusIcon = statusConfig.icon;

          return (
            <div key={offer.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {offer.profiles.profile_image_url ? (
                    <img 
                      src={offer.profiles.profile_image_url} 
                      alt={offer.profiles.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-900">{offer.profiles.username}</h4>
                    <p className="text-sm text-gray-500">
                      {offer.profiles.wallet_address.slice(0, 8)}...{offer.profiles.wallet_address.slice(-6)}
                    </p>
                  </div>
                </div>

                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                  <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                  <span className={`text-sm font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-xl font-bold text-green-600">
                    {formatSOL(offer.offer_amount)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500">
                  {formatDate(offer.created_at)}
                </div>
              </div>

              {offer.offer_message && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{offer.offer_message}</p>
                </div>
              )}

              {/* Offer Responses */}
              {offer.offer_responses && offer.offer_responses.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Responses:</h5>
                  {offer.offer_responses.map((response) => (
                    <div key={response.id} className="ml-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-blue-800">
                          {response.response_type.charAt(0).toUpperCase() + response.response_type.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(response.created_at)}
                        </span>
                      </div>
                      
                      {response.counter_amount && (
                        <p className="text-sm text-blue-700">
                          Counter offer: {formatSOL(response.counter_amount)}
                        </p>
                      )}
                      
                      {response.response_message && (
                        <p className="text-sm text-blue-700 mt-1">
                          {response.response_message}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-600 mt-1">
                        by {response.profiles.username}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Expiration Info */}
              {offer.status === 'pending' && (
                <div className="mt-3 text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Expires: {formatDate(offer.expires_at)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
