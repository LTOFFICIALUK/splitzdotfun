// TypeScript interfaces for royalty payouts

export interface RoyaltyPayout {
  id: string;
  token_id: string;
  token_ownership_id: string;
  
  // Claimer information
  claimer_user_id: string | null;
  claimer_wallet_address: string;
  claimer_social_handle: string | null;
  
  // Royalty information
  royalty_earner_social_or_wallet: string;
  royalty_role: string;
  royalty_percentage: number;
  
  // Payout details
  payout_amount: number;
  payout_amount_usd: number | null;
  sol_price_at_payout: number | null;
  
  // Transaction details
  transaction_signature: string | null;
  transaction_status: 'pending' | 'confirmed' | 'failed';
  transaction_error: string | null;
  
  // Fee information
  network_fee: number;
  platform_fee: number;
  
  // Metadata
  claim_reason: string | null;
  claim_notes: string | null;
  payout_method: 'wallet' | 'social_handle' | 'other';
  
  // Timestamps
  claimed_at: string;
  processed_at: string | null;
  completed_at: string | null;
  
  // Audit fields
  created_at: string;
  updated_at: string;
}

export interface CreateRoyaltyPayoutData {
  token_id: string;
  token_ownership_id: string;
  claimer_user_id?: string;
  claimer_wallet_address: string;
  claimer_social_handle?: string;
  royalty_earner_social_or_wallet: string;
  royalty_role: string;
  royalty_percentage: number;
  payout_amount: number;
  payout_amount_usd?: number;
  sol_price_at_payout?: number;
  transaction_signature?: string;
  transaction_status?: 'pending' | 'confirmed' | 'failed';
  transaction_error?: string;
  network_fee?: number;
  platform_fee?: number;
  claim_reason?: string;
  claim_notes?: string;
  payout_method?: 'wallet' | 'social_handle' | 'other';
}

export interface RoyaltyPayoutWithToken extends RoyaltyPayout {
  token?: {
    id: string;
    name: string;
    symbol: string;
    contract_address: string;
    image_url: string | null;
  };
  token_ownership?: {
    id: string;
    current_owner: string;
    total_fees_earned: number;
  };
  claimer_profile?: {
    id: string;
    username: string | null;
    profile_image_url: string | null;
  };
}

export interface RoyaltyPayoutStats {
  total_payouts: number;
  total_amount_sol: number;
  total_amount_usd: number;
  average_payout_sol: number;
  successful_payouts: number;
  failed_payouts: number;
  pending_payouts: number;
  total_platform_fees: number;
  total_network_fees: number;
}

export interface RoyaltyPayoutFilters {
  token_id?: string;
  claimer_wallet_address?: string;
  royalty_earner_social_or_wallet?: string;
  transaction_status?: 'pending' | 'confirmed' | 'failed';
  payout_method?: 'wallet' | 'social_handle' | 'other';
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}
