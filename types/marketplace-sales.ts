export interface MarketplaceSale {
  id: number;
  
  // Token details
  token_id: string; // UUID
  token_name: string;
  token_symbol: string;
  contract_address: string;
  
  // Listing details
  listing_id?: number;
  listing_time?: string;
  listing_price_sol?: number;
  listing_price_usd?: number;
  
  // Sale details
  sale_time: string;
  time_to_sell_minutes?: number;
  sale_price_sol: number;
  sale_price_usd?: number;
  
  // Transaction details
  transaction_hash?: string;
  transaction_status: 'confirmed' | 'pending' | 'failed';
  block_number?: number;
  
  // Parties involved
  seller_wallet?: string;
  seller_social_handle?: string;
  buyer_wallet?: string;
  buyer_social_handle?: string;
  
  // Financial details
  fees_sol: number;
  fees_usd: number;
  platform_fee_sol: number;
  platform_fee_usd: number;
  royalty_fee_sol: number;
  royalty_fee_usd: number;
  
  // Royalty earners
  old_royalty_earners?: RoyaltyEarner[];
  new_royalty_earners?: RoyaltyEarner[];
  royalty_earners_changed: boolean;
  
  // Market data
  market_cap_at_sale?: number;
  holder_count_at_sale?: number;
  volume_24h_at_sale?: number;
  
  // Metadata
  sale_type: 'marketplace' | 'auction' | 'direct';
  payment_method: 'sol' | 'usdc' | 'other';
  is_verified_sale: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RoyaltyEarner {
  social_or_wallet: string;
  royalty_percentage: number;
  role?: string;
}

export interface CreateMarketplaceSaleData {
  token_id: string; // UUID
  token_name: string;
  token_symbol: string;
  contract_address: string;
  listing_id?: number;
  listing_time?: string;
  listing_price_sol?: number;
  listing_price_usd?: number;
  sale_price_sol: number;
  sale_price_usd?: number;
  transaction_hash?: string;
  transaction_status?: 'confirmed' | 'pending' | 'failed';
  block_number?: number;
  seller_wallet?: string;
  seller_social_handle?: string;
  buyer_wallet?: string;
  buyer_social_handle?: string;
  fees_sol?: number;
  fees_usd?: number;
  platform_fee_sol?: number;
  platform_fee_usd?: number;
  royalty_fee_sol?: number;
  royalty_fee_usd?: number;
  old_royalty_earners?: RoyaltyEarner[];
  new_royalty_earners?: RoyaltyEarner[];
  market_cap_at_sale?: number;
  holder_count_at_sale?: number;
  volume_24h_at_sale?: number;
  sale_type?: 'marketplace' | 'auction' | 'direct';
  payment_method?: 'sol' | 'usdc' | 'other';
  is_verified_sale?: boolean;
}

export interface MarketplaceSaleStats {
  total_sales: number;
  total_volume_sol: number;
  total_volume_usd: number;
  total_fees_sol: number;
  total_fees_usd: number;
  average_sale_price_sol: number;
  average_sale_price_usd: number;
  average_time_to_sell_minutes: number;
  total_sellers: number;
  total_buyers: number;
  verified_sales: number;
  pending_sales: number;
  failed_sales: number;
}

export interface MarketplaceSaleFilters {
  token_id?: string; // UUID
  seller_wallet?: string;
  buyer_wallet?: string;
  transaction_status?: 'confirmed' | 'pending' | 'failed';
  sale_type?: 'marketplace' | 'auction' | 'direct';
  payment_method?: 'sol' | 'usdc' | 'other';
  date_from?: string;
  date_to?: string;
  min_price_sol?: number;
  max_price_sol?: number;
  is_verified_sale?: boolean;
}

export interface MarketplaceSaleResponse {
  success: boolean;
  data?: MarketplaceSale[];
  stats?: MarketplaceSaleStats;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
