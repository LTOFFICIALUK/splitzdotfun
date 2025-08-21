import React from 'react';
import Link from 'next/link';
import Button from './Button';
import { ShoppingCart, User, Clock } from 'lucide-react';

interface ListingCardProps {
  listing: {
    id: string;
    tokenName: string;
    tokenTicker: string;
    tokenAddress: string;
    ownershipPercentage: number;
    price: number;
    currency: 'SOL' | 'USD';
    description: string;
    seller: string;
    imageUrl: string;
  };
  className?: string;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  className = '',
}) => {
  const handleBuyNow = () => {
    alert(`Buying ${listing.ownershipPercentage}% of ${listing.tokenName} for ${listing.price} ${listing.currency}... (This is a stub)`);
  };



  const handleContactSeller = () => {
    alert(`Contacting seller ${listing.seller}... (This is a stub)`);
  };

  return (
    <div className={`bg-background-card rounded-2xl border border-background-elevated overflow-hidden hover:border-primary-mint/30 transition-all duration-200 ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-background-elevated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center flex-shrink-0">
              <span className="text-background-dark font-bold text-lg">{listing.tokenTicker.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-text-primary truncate">{listing.tokenName}</h3>
              <p className="text-text-secondary text-sm font-mono truncate max-w-[180px] sm:max-w-[220px] md:max-w-[200px]">
                {listing.tokenAddress}
              </p>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-xl sm:text-2xl font-bold text-primary-mint">
              {listing.price} {listing.currency}
            </div>
            <div className="text-text-secondary text-sm">
              {listing.ownershipPercentage}% ownership
            </div>
          </div>
        </div>
        
        <p className="text-text-secondary text-sm leading-relaxed">
          {listing.description}
        </p>
      </div>

      {/* Seller Info */}
      <div className="px-4 sm:px-6 py-4 bg-background-elevated">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 min-w-0">
            <User className="w-4 h-4 text-text-secondary flex-shrink-0" />
            <span className="text-text-secondary text-sm flex-shrink-0">Seller:</span>
            <span className="text-text-primary font-medium truncate">{listing.seller}</span>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Clock className="w-4 h-4 text-text-secondary" />
            <span className="text-text-secondary text-sm">Listed 2 days ago</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 sm:p-6 space-y-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleBuyNow}
          className="w-full flex items-center justify-center"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Buy Now
        </Button>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Link href={`/marketplace/${listing.tokenAddress}`} className="flex-1">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
            >
              View Details
            </Button>
          </Link>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleContactSeller}
            className="flex-1"
          >
            Contact Seller
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
