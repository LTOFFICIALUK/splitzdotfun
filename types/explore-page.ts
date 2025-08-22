// TypeScript interfaces for explore page data

export interface ExplorePageToken {
  id: string;
  token_id: string;
  contract_address: string;
  name: string;
  symbol: string;
  image_url: string | null;
  market_cap: number | null;
  volume_24h: number | null;
  price: number | null;
  price_change_24h: number | null;
  social_link: string | null;
  website_link: string | null;
  solscan_link: string;
  category: 'new' | '24h' | 'older';
  last_updated: string;
  created_at: string;
}

export interface JupiterTokenData {
  address: string;
  name: string;
  symbol: string;
  image: string;
  marketCap: number;
  volume24h: number;
  price: number;
  priceChange24h: number;
}

export interface ExplorePageResponse {
  newTokens: ExplorePageToken[];
  last24Hours: ExplorePageToken[];
  olderTokens: ExplorePageToken[];
  lastUpdated: string;
}

// Database insert types (without auto-generated fields)
export interface CreateExplorePageTokenData {
  token_id: string;
  contract_address: string;
  name: string;
  symbol: string;
  image_url?: string;
  market_cap?: number;
  volume_24h?: number;
  price?: number;
  price_change_24h?: number;
  social_link?: string;
  website_link?: string;
  solscan_link: string;
  category: 'new' | '24h' | 'older';
}

// Update types for partial updates
export interface UpdateExplorePageTokenData {
  name?: string;
  symbol?: string;
  image_url?: string;
  market_cap?: number;
  volume_24h?: number;
  price?: number;
  price_change_24h?: number;
  social_link?: string;
  website_link?: string;
  category?: 'new' | '24h' | 'older';
}
