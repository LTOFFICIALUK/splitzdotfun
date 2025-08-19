import React from 'react';
import { Filter, SortAsc, SortDesc } from 'lucide-react';

interface MarketplaceFiltersProps {
  activeTab: 'listings' | 'auctions';
  sortBy: string;
  onSortChange: (sort: string) => void;
  className?: string;
}

const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  activeTab,
  sortBy,
  onSortChange,
  className = '',
}) => {
  const getSortOptions = () => {
    if (activeTab === 'listings') {
      return [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'price-high', label: 'Price (High to Low)' },
        { value: 'price-low', label: 'Price (Low to High)' },
        { value: 'percentage-high', label: 'Ownership % (High to Low)' },
        { value: 'percentage-low', label: 'Ownership % (Low to High)' },
      ];
    } else {
      return [
        { value: 'ending-soon', label: 'Ending Soon' },
        { value: 'newest', label: 'Newest First' },
        { value: 'bids-high', label: 'Most Bids' },
        { value: 'bids-low', label: 'Least Bids' },
        { value: 'price-high', label: 'Current Bid (High to Low)' },
        { value: 'price-low', label: 'Current Bid (Low to High)' },
      ];
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center space-x-2 text-text-secondary text-sm">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>
        
        <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-background-dark border border-background-elevated text-text-secondary hover:text-text-primary hover:border-primary-mint/30 transition-all duration-200">
          All Tokens
        </button>
        
        <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-background-dark border border-background-elevated text-text-secondary hover:text-text-primary hover:border-primary-mint/30 transition-all duration-200">
          High Value
        </button>
        
        <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-background-dark border border-background-elevated text-text-secondary hover:text-text-primary hover:border-primary-mint/30 transition-all duration-200">
          Low Value
        </button>
        
        <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-background-dark border border-background-elevated text-text-secondary hover:text-text-primary hover:border-primary-mint/30 transition-all duration-200">
          Verified Sellers
        </button>
      </div>

      {/* Sort Options */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-text-secondary text-sm">
          {sortBy.includes('high') ? (
            <SortDesc className="w-4 h-4" />
          ) : (
            <SortAsc className="w-4 h-4" />
          )}
          <span>Sort by:</span>
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-background-dark border border-background-elevated rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
        >
          {getSortOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default MarketplaceFilters;
