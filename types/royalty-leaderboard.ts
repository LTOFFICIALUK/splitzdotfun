// TypeScript interfaces for royalty leaderboard

export interface RoyaltyLeaderboardEntry {
  id: string;
  time_period: '24h' | '7d' | '30d' | 'all_time';
  rank_position: number;
  royalty_earner_social_or_wallet: string;
  royalty_role: string | null;
  total_earnings_sol: number;
  total_earnings_usd: number;
  payout_count: number;
  tokens_earned_from: number;
  top_token_id: string | null;
  top_token_name: string | null;
  top_token_symbol: string | null;
  period_start: string | null;
  period_end: string | null;
  average_payout_usd: number | null;
  largest_single_payout_usd: number | null;
  most_recent_payout_at: string | null;
  last_updated: string;
}

export interface RoyaltyLeaderboardResponse {
  success: boolean;
  time_period: string;
  data: RoyaltyLeaderboardEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  metadata: {
    period_start: string | null;
    period_end: string | null;
    last_updated: string;
  } | null;
  timestamp: string;
}

export interface LeaderboardUpdateResult {
  period: string;
  success: boolean;
  count?: number;
  error?: string;
}

export interface LeaderboardUpdateResponse {
  success: boolean;
  message: string;
  results: LeaderboardUpdateResult[];
  timestamp: string;
}

export interface LeaderboardFilters {
  time_period?: '24h' | '7d' | '30d' | 'all_time';
  limit?: number;
  offset?: number;
  min_earnings?: number;
  max_earnings?: number;
  role?: string;
}

export interface LeaderboardStats {
  total_earners: number;
  total_earnings_usd: number;
  total_earnings_sol: number;
  average_earnings_usd: number;
  top_earner: {
    social_or_wallet: string;
    earnings_usd: number;
    role: string;
  } | null;
  period_info: {
    start: string | null;
    end: string;
    last_updated: string;
  };
}
