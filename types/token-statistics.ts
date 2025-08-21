// TypeScript interfaces for token statistics from Jupiter API

export interface JupiterTokenStats {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  dev: string;
  circSupply: number;
  totalSupply: number;
  tokenProgram: string;
  launchpad: string;
  metaLaunchpad: string;
  partnerConfig: string;
  firstPool: {
    id: string;
    createdAt: string;
  };
  graduatedPool: string;
  graduatedAt: string;
  holderCount: number;
  audit: {
    mintAuthorityDisabled: boolean;
    freezeAuthorityDisabled: boolean;
    topHoldersPercentage: number;
    devMigrations: number;
  };
  organicScore: number;
  organicScoreLabel: string;
  isVerified: boolean;
  tags: string[];
  fdv: number;
  mcap: number;
  usdPrice: number;
  priceBlockId: number;
  liquidity: number;
  stats5m: JupiterTimeStats;
  stats1h: JupiterTimeStats;
  stats6h: JupiterTimeStats;
  stats24h: JupiterTimeStats;
  ctLikes: number;
  smartCtLikes: number;
  updatedAt: string;
}

export interface JupiterTimeStats {
  priceChange: number;
  holderChange: number;
  liquidityChange: number;
  volumeChange: number;
  buyVolume: number;
  sellVolume: number;
  buyOrganicVolume?: number;
  sellOrganicVolume?: number;
  numBuys: number;
  numSells: number;
  numTraders: number;
  numOrganicBuyers?: number;
  numNetBuyers: number;
}

export interface TokenStatistics {
  id: string;
  token_id: string;
  contract_address: string;
  jupiter_id: string | null;
  name: string | null;
  symbol: string | null;
  icon: string | null;
  decimals: number | null;
  dev: string | null;
  circ_supply: number | null;
  total_supply: number | null;
  token_program: string | null;
  launchpad: string | null;
  meta_launchpad: string | null;
  partner_config: string | null;
  holder_count: number | null;
  mint_authority_disabled: boolean | null;
  freeze_authority_disabled: boolean | null;
  top_holders_percentage: number | null;
  dev_migrations: number | null;
  organic_score: number | null;
  organic_score_label: string | null;
  is_verified: boolean | null;
  tags: string[] | null;
  fdv: number | null;
  mcap: number | null;
  usd_price: number | null;
  price_block_id: number | null;
  liquidity: number | null;
  ct_likes: number | null;
  smart_ct_likes: number | null;
  stats_5m: JupiterTimeStats | null;
  stats_1h: JupiterTimeStats | null;
  stats_6h: JupiterTimeStats | null;
  stats_24h: JupiterTimeStats | null;
  jupiter_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTokenStatisticsData {
  token_id: string;
  contract_address: string;
  jupiter_id?: string;
  name?: string;
  symbol?: string;
  icon?: string;
  decimals?: number;
  dev?: string;
  circ_supply?: number;
  total_supply?: number;
  token_program?: string;
  launchpad?: string;
  meta_launchpad?: string;
  partner_config?: string;
  holder_count?: number;
  mint_authority_disabled?: boolean;
  freeze_authority_disabled?: boolean;
  top_holders_percentage?: number;
  dev_migrations?: number;
  organic_score?: number;
  organic_score_label?: string;
  is_verified?: boolean;
  tags?: string[];
  fdv?: number;
  mcap?: number;
  usd_price?: number;
  price_block_id?: number;
  liquidity?: number;
  ct_likes?: number;
  smart_ct_likes?: number;
  stats_5m?: JupiterTimeStats;
  stats_1h?: JupiterTimeStats;
  stats_6h?: JupiterTimeStats;
  stats_24h?: JupiterTimeStats;
  jupiter_updated_at?: string;
}
