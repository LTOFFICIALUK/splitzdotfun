export interface Token {
  id: string;
  name: string;
  ticker: string;
  address: string;
  logoUrl: string;
  mcap: number;
  change24h: number;
  creatorRewardsSOL: number;
}

export interface LeaderboardEntry {
  handle: string;
  avatarUrl: string;
  earnedSOL: number;
  tokenTicker: string;
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
