'use client';

import React from 'react';
import { MessageSquare, Clock, User, TrendingUp, TrendingDown, CheckCircle, X } from 'lucide-react';

interface Offer {
  id: string;
  offer_amount: number;
  offer_message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  expires_at: string;
  created_at: string;
  profiles: {
    username?: string;
    wallet_address: string;
    profile_image_url?: string;
  };
  marketplace_listings: {
    tokens: {
      name: string;
      symbol: string;
      image_url?: string;
    };
  };
}

interface OfferCardProps {
  offer: Offer;
  className?: string;
}

export default function OfferCard({ offer, className = '' }: OfferCardProps) {
  const formatSOL = (amount: number) => {
    return `${amount.toFixed(3)} SOL`;
  };

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Expired';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-blue-600 bg-blue-50';
      case 'accepted':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      case 'countered':
        return 'text-purple-600 bg-purple-50';
      case 'expired':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      case 'countered':
        return <TrendingUp className="w-4 h-4" />;
      case 'expired':
        return <Clock className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const isExpired = () => {
    const now = new Date();
    const expires = new Date(offer.expires_at);
    return expires.getTime() <= now.getTime();
  };

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              {offer.marketplace_listings.tokens.image_url ? (
                <img 
                  src={offer.marketplace_listings.tokens.image_url} 
                  alt={offer.marketplace_listings.tokens.name}
                  className="w-6 h-6 rounded"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {offer.marketplace_listings.tokens.symbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{offer.marketplace_listings.tokens.name}</h3>
              <p className="text-sm text-gray-500">{offer.marketplace_listings.tokens.symbol}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-1">
              {getStatusIcon(offer.status)}
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(offer.status)}`}>
                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
              </span>
            </div>
            {offer.status === 'pending' && !isExpired() && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600">
                  {formatTimeLeft(offer.expires_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Offer Amount */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Offer Amount:</span>
            <span className="font-semibold text-lg text-purple-600">
              {formatSOL(offer.offer_amount)}
            </span>
          </div>
        </div>

        {/* Buyer Info */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">Buyer:</span>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mr-2">
              {offer.profiles.profile_image_url ? (
                <img 
                  src={offer.profiles.profile_image_url} 
                  alt="Profile"
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <User className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm font-medium">
              {offer.profiles.username || 
               `${offer.profiles.wallet_address.slice(0, 6)}...${offer.profiles.wallet_address.slice(-4)}`}
            </span>
          </div>
        </div>

        {/* Offer Message */}
        {offer.offer_message && (
          <div className="mb-4">
            <div className="flex items-start space-x-2">
              <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="bg-gray-50 rounded-lg p-3 flex-1">
                <p className="text-sm text-gray-700">{offer.offer_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created: {new Date(offer.created_at).toLocaleDateString()}</span>
          {offer.status === 'pending' && (
            <span>
              {isExpired() ? 'Expired' : `Expires: ${new Date(offer.expires_at).toLocaleDateString()}`}
            </span>
          )}
        </div>

        {/* Action Indicators */}
        {offer.status === 'countered' && (
          <div className="mt-3 p-2 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">
                Seller made a counter-offer
              </span>
            </div>
          </div>
        )}

        {offer.status === 'accepted' && (
          <div className="mt-3 p-2 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Offer accepted by seller
              </span>
            </div>
          </div>
        )}

        {offer.status === 'rejected' && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <X className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                Offer rejected by seller
              </span>
            </div>
          </div>
        )}

        {offer.status === 'expired' && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700 font-medium">
                Offer expired
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
