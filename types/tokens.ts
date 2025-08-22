// TypeScript interfaces for tokens and token ownership

export interface Token {
  id: string;
  deployer_user_id: string | null;
  deployer_social_or_wallet: string;
  name: string;
  symbol: string;
  description: string | null;
  contract_address: string;
  token_link: string;
  social_link: string | null;
  image_url: string | null;
  banner_url: string | null;
  metadata_url: string;
  created_at: string;
  updated_at: string;
  fees_generated: number;
  // Additional fields for explore page
  ticker?: string;
  address?: string;
  logoUrl?: string;
  mcap?: number;
  change24h?: number;
  creatorRewardsSOL?: number;
  website_link?: string;
  solscan_link?: string;
}

export interface RoyaltyEarner {
  social_or_wallet: string; // "@username" or wallet address
  role: string; // "Creator", "Management", etc.
  percentage: number; // 0-100
}

export interface OwnershipRecord {
  owner: string; // wallet address or social handle
  from: string; // ISO date string
  to: string | null; // ISO date string, null if current owner
}

export interface TokenOwnership {
  id: string;
  token_id: string;
  deployer_user_id: string | null;
  current_owner: string; // wallet address or social handle
  current_owner_user_id: string | null;
  royalty_earners: RoyaltyEarner[];
  ownership_history: OwnershipRecord[] | null;
  total_fees_earned: number;
  fees_owed_per_earner: Record<string, number>; // { "@user": 0.5, "wallet_address": 0.3 }
  fees_claimed_per_earner: Record<string, number>; // { "@user": 0.2, "wallet_address": 0.1 }
  total_fees_claimed: number;
  created_at: string;
  updated_at: string;
}

// Database insert types (without auto-generated fields)
export interface CreateTokenData {
  deployer_user_id?: string;
  deployer_social_or_wallet: string;
  name: string;
  symbol: string;
  description?: string;
  contract_address: string;
  token_link: string;
  social_link?: string;
  image_url?: string;
  banner_url?: string;
  metadata_url: string;
}

export interface CreateTokenOwnershipData {
  token_id: string;
  deployer_user_id?: string;
  current_owner: string;
  current_owner_user_id?: string;
  royalty_earners: RoyaltyEarner[];
  ownership_history?: OwnershipRecord[];
  total_fees_earned?: number;
  fees_owed_per_earner?: Record<string, number>;
  fees_claimed_per_earner?: Record<string, number>;
  total_fees_claimed?: number;
}

// Utility types for API responses
export interface TokenWithOwnership extends Token {
  ownership: TokenOwnership;
}

export interface TokenListResponse {
  tokens: TokenWithOwnership[];
  total: number;
  page: number;
  limit: number;
}
