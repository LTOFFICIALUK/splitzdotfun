'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import TokenColumn from '@/components/ui/TokenColumn';
import { ExplorePageToken } from '@/types/explore-page';

// Convert ExplorePageToken to Token format for TokenColumn component
const convertToTokenFormat = (exploreToken: ExplorePageToken) => ({
  id: exploreToken.id,
  name: exploreToken.name,
  ticker: exploreToken.symbol,
  address: exploreToken.contract_address,
  logoUrl: exploreToken.image_url || '/images/placeholder-token.png',
  mcap: exploreToken.market_cap || 0,
  change24h: exploreToken.price_change_24h || 0,
  creatorRewardsSOL: 0.05, // Default value
  social_link: exploreToken.social_link || undefined,
  website_link: exploreToken.website_link || undefined,
  solscan_link: exploreToken.solscan_link || undefined
});

const ExplorePage: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [newTokens, setNewTokens] = useState<ExplorePageToken[]>([]);
  const [last24Hours, setLast24Hours] = useState<ExplorePageToken[]>([]);
  const [olderTokens, setOlderTokens] = useState<ExplorePageToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch explore page data
  const fetchExploreData = async () => {
    try {
      const response = await fetch('/api/explore-data');
      if (!response.ok) {
        throw new Error('Failed to fetch explore data');
      }
      
      const data = await response.json();
      setNewTokens(data.newTokens || []);
      setLast24Hours(data.last24Hours || []);
      setOlderTokens(data.olderTokens || []);
      setLastUpdated(data.lastUpdated || '');
    } catch (error) {
      console.error('Error fetching explore data:', error);
      // Fallback to empty arrays if API fails
      setNewTokens([]);
      setLast24Hours([]);
      setOlderTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchExploreData();
  }, []);

  // Convert to Token format for TokenColumn
  const newTokensFormatted = newTokens.map(convertToTokenFormat);
  const last24HoursFormatted = last24Hours.map(convertToTokenFormat);
  const olderTokensFormatted = olderTokens.map(convertToTokenFormat);

  return (
    <div className="h-screen bg-background-dark flex flex-col overflow-hidden">
      {/* Header */}
      <Header currentPath="/explore" />
      
      {/* Page Content - Takes remaining height */}
      <div className="flex-1 flex flex-col pt-16 px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
        {/* Page Heading */}
        <div className="pt-6 pb-4 flex-shrink-0">
          <h1 className="text-xl font-bold text-text-primary">Explore</h1>
          {lastUpdated && (
            <p className="text-xs text-text-secondary mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        
        {/* Loading state */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-secondary">Loading tokens...</div>
          </div>
        ) : (
          /* Columns - Flex layout to enable per-column scrolling */
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0">
          <div className="flex-1 min-h-0 min-w-0">
            <TokenColumn 
                title="New Tokens" 
                tokens={newTokensFormatted} 
              icon="⚡" 
              metricValue="0.05" 
              filters={['P1', 'P2', 'P3']} 
              selectedFilters={selectedFilters} 
              onFilterChange={setSelectedFilters} 
            />
          </div>
          <div className="flex-1 min-h-0 min-w-0">
            <TokenColumn 
                title="Last 24 Hours" 
                tokens={last24HoursFormatted} 
              icon="⏰" 
              metricValue="0" 
              filters={['P1', 'P2', 'P3']} 
              selectedFilters={selectedFilters} 
              onFilterChange={setSelectedFilters} 
            />
          </div>
          <div className="flex-1 min-h-0 min-w-0">
            <TokenColumn 
                title="Older Tokens" 
                tokens={olderTokensFormatted} 
              icon="🔗" 
              metricValue="0" 
              filters={['P1', 'P2', 'P3']} 
              selectedFilters={selectedFilters} 
              onFilterChange={setSelectedFilters} 
            />
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
