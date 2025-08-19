import React from 'react';
import Button from './Button';
import { Gavel, User, Clock, Users } from 'lucide-react';

interface AuctionCardProps {
  auction: {
    id: string;
    tokenName: string;
    tokenTicker: string;
    tokenAddress: string;
    ownershipPercentage: number;
    price: number;
    currency: 'SOL' | 'USD';
    description: string;
    seller: string;
    timeLeft: string;
    bids: number;
    endTime: string;
    imageUrl: string;
  };
  className?: string;
}

const AuctionCard: React.FC<AuctionCardProps> = ({
  auction,
  className = '',
}) => {
  const handlePlaceBid = () => {
    alert(`Placing bid on ${auction.ownershipPercentage}% of ${auction.tokenName}... (This is a stub)`);
  };

  const handleViewAuction = () => {
    alert(`Viewing auction details for ${auction.tokenName}... (This is a stub)`);
  };

  const handleWatchAuction = () => {
    alert(`Watching auction for ${auction.tokenName}... (This is a stub)`);
  };

  return (
    <div className={`bg-background-card rounded-2xl border border-background-elevated overflow-hidden hover:border-primary-mint/30 transition-all duration-200 ${className}`}>
      {/* Header with Time Left Badge */}
      <div className="p-6 border-b border-background-elevated relative">
        <div className="absolute top-4 right-4">
          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            {auction.timeLeft}
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
              <span className="text-background-dark font-bold text-lg">{auction.tokenTicker.charAt(0)}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{auction.tokenName}</h3>
              <p className="text-text-secondary text-sm font-mono">{auction.tokenAddress}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-mint">
              {auction.price} {auction.currency}
            </div>
            <div className="text-text-secondary text-sm">
              {auction.ownershipPercentage}% ownership
            </div>
          </div>
        </div>
        
        <p className="text-text-secondary text-sm leading-relaxed">
          {auction.description}
        </p>
      </div>

      {/* Auction Stats */}
      <div className="px-6 py-4 bg-background-elevated">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-text-secondary" />
            <span className="text-text-secondary text-sm">Seller:</span>
            <span className="text-text-primary font-medium">{auction.seller}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-text-secondary" />
            <span className="text-text-secondary text-sm">{auction.bids} bids</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-text-secondary" />
            <span className="text-text-secondary text-sm">Ends:</span>
            <span className="text-text-primary text-sm">{auction.timeLeft}</span>
          </div>
          
          <div className="text-right">
            <span className="text-text-secondary text-sm">Current Bid</span>
            <div className="text-primary-mint font-semibold">
              {auction.price} {auction.currency}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handlePlaceBid}
          className="w-full flex items-center justify-center"
        >
          <Gavel className="w-4 h-4 mr-2" />
          Place Bid
        </Button>
        
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewAuction}
            className="flex-1"
          >
            View Auction
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleWatchAuction}
            className="flex-1"
          >
            Watch
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;
