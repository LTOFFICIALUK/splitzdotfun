export interface Token {
  id: string;
  name: string;
  ticker: string;
  address: string;
  logoUrl: string;
  mcap: number;
  change24h: number;
  creatorRewardsSOL: number;
  holder_count?: number;
  social_link?: string;
  website_link?: string;
  solscan_link?: string;
}

export interface LeaderboardEntry {
  handle: string;
  avatarUrl: string;
  earnedSOL: number;
  tokenTicker: string;
}

// New royalty leaderboard entry structure
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

// Wallet-related types
export interface WalletContextState {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAndSendTransaction: (transaction: any) => Promise<string>;
  wallet: any;
}

export interface WalletError {
  name: string;
  message: string;
  code?: number;
}

// Phantom wallet specific types
export interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toBytes(): Uint8Array } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args: any) => void) => void;
  publicKey: { toBytes(): Uint8Array } | null;
  signTransaction: (transaction: any) => Promise<any>;
  signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export interface MyTokens {
  ownerShort: string;
  items: Token[];
}

export interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: {
    label: string;
    onClick: () => void;
  };
}

export interface TokenCardProps {
  logo: string;
  name: string;
  ticker: string;
  shortAddress: string;
  mcap: number;
  change: number;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  }>;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export interface FilterPillsProps {
  filters: string[];
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  className?: string;
}

export interface TokenGridProps {
  tokens: Token[];
  className?: string;
}

export interface TokenColumnProps {
  title: string;
  tokens: Token[];
  icon: string;
  metricValue: string;
  filters: string[];
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  className?: string;
}

export interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  className?: string;
}

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export interface MarketplaceListing {
  id: string;
  type: 'listing' | 'auction';
  tokenName: string;
  tokenTicker: string;
  tokenAddress: string;
  ownershipPercentage: number;
  price: number;
  currency: 'SOL' | 'USD';
  description: string;
  seller: string;
  timeLeft?: string;
  bids?: number;
  endTime?: string;
  imageUrl: string;
}

export interface ListingCardProps {
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

export interface AuctionCardProps {
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

export interface MarketplaceFiltersProps {
  activeTab: 'listings' | 'auctions';
  sortBy: string;
  onSortChange: (sort: string) => void;
  className?: string;
}

// Export token types from separate file
export * from './tokens';
