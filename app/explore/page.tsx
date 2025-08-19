'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import TokenColumn from '@/components/ui/TokenColumn';
import { Token } from '@/types';

// Mock data for the three columns
const newPairsTokens: Token[] = [
  {
    id: 'ucult-1',
    name: 'UCULT UserCult',
    ticker: 'UCULT',
    address: 'Ggot...pump',
    logoUrl: '/images/placeholder-token.png',
    mcap: 12100,
    change24h: -35,
    creatorRewardsSOL: 0.05
  },
  {
    id: 'loki-1',
    name: 'LOKI LOKI - Son of Odin',
    ticker: 'LOKI',
    address: 'A1B2...C3D4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 5700,
    change24h: -7,
    creatorRewardsSOL: 0.03
  },
  {
    id: 'wolfe-1',
    name: 'Wolfe Wolfe',
    ticker: 'WOLFE',
    address: 'B4jC...pump',
    logoUrl: '/images/placeholder-token.png',
    mcap: 6790,
    change24h: 15,
    creatorRewardsSOL: 0.02
  },
  {
    id: 'spongebob-1',
    name: 'sPunGbOb MoCkInG sPunG bC',
    ticker: 'SPONGE',
    address: '8Dny...pump',
    logoUrl: '/images/placeholder-token.png',
    mcap: 61500,
    change24h: -41,
    creatorRewardsSOL: 0.08
  },
  {
    id: 'wolfe2-1',
    name: 'wolfe wolfe',
    ticker: 'WOLF2',
    address: 'EycZ...pump',
    logoUrl: '/images/placeholder-token.png',
    mcap: 212000,
    change24h: 11,
    creatorRewardsSOL: 0.15
  },
  {
    id: 'forest-1',
    name: 'FOREST Forestcoin',
    ticker: 'FOREST',
    address: 'F1G2...pump',
    logoUrl: '/images/placeholder-token.png',
    mcap: 8900,
    change24h: -18,
    creatorRewardsSOL: 0.04
  },
  {
    id: 'ticker56-1',
    name: 'TICKER56 COIN20',
    ticker: 'TICK56',
    address: 'H3I4...pump',
    logoUrl: '/images/placeholder-token.png',
    mcap: 15600,
    change24h: 23,
    creatorRewardsSOL: 0.06
  },
  {
    id: 'extra1-1',
    name: 'EXTRA Token One',
    ticker: 'EXTRA1',
    address: 'X1Y2...Z3W4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 25000,
    change24h: 8,
    creatorRewardsSOL: 0.12
  },
  {
    id: 'extra2-1',
    name: 'EXTRA Token Two',
    ticker: 'EXTRA2',
    address: 'A5B6...C7D8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 18000,
    change24h: -12,
    creatorRewardsSOL: 0.09
  },
  {
    id: 'extra3-1',
    name: 'EXTRA Token Three',
    ticker: 'EXTRA3',
    address: 'E9F0...G1H2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 32000,
    change24h: 25,
    creatorRewardsSOL: 0.18
  },
  {
    id: 'extra4-1',
    name: 'EXTRA Token Four',
    ticker: 'EXTRA4',
    address: 'I3J4...K5L6',
    logoUrl: '/images/placeholder-token.png',
    mcap: 28000,
    change24h: -5,
    creatorRewardsSOL: 0.14
  },
  {
    id: 'extra5-1',
    name: 'EXTRA Token Five',
    ticker: 'EXTRA5',
    address: 'M7N8...O9P0',
    logoUrl: '/images/placeholder-token.png',
    mcap: 35000,
    change24h: 18,
    creatorRewardsSOL: 0.21
  },
  {
    id: 'extra6-1',
    name: 'EXTRA Token Six',
    ticker: 'EXTRA6',
    address: 'Q1R2...S3T4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 42000,
    change24h: -8,
    creatorRewardsSOL: 0.16
  },
  {
    id: 'extra7-1',
    name: 'EXTRA Token Seven',
    ticker: 'EXTRA7',
    address: 'U5V6...W7X8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 38000,
    change24h: 12,
    creatorRewardsSOL: 0.19
  },
  {
    id: 'extra8-1',
    name: 'EXTRA Token Eight',
    ticker: 'EXTRA8',
    address: 'Y9Z0...A1B2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 45000,
    change24h: -15,
    creatorRewardsSOL: 0.24
  }
];

const aboutToBondTokens: Token[] = [
  {
    id: 'titty-1',
    name: 'titty titty',
    ticker: 'TITTY',
    address: 'I9J0...K1L2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 59900,
    change24h: -20,
    creatorRewardsSOL: 0.12
  },
  {
    id: 'yzy-1',
    name: 'YZY YZY',
    ticker: 'YZY',
    address: 'M3N4...05P6',
    logoUrl: '/images/placeholder-token.png',
    mcap: 56200,
    change24h: -73,
    creatorRewardsSOL: 0.08
  },
  {
    id: 'apiq-1',
    name: 'ApiQ ApiQ',
    ticker: 'APIQ',
    address: 'Q7R8...S9T0',
    logoUrl: '/images/placeholder-token.png',
    mcap: 50300,
    change24h: -74,
    creatorRewardsSOL: 0.07
  },
  {
    id: 'woof-1',
    name: 'WOOF Woof',
    ticker: 'WOOF',
    address: 'U1V2...W3X4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 49400,
    change24h: -37,
    creatorRewardsSOL: 0.09
  },
  {
    id: 'balltze-1',
    name: 'Balltze Balltze Coin',
    ticker: 'BALLTZE',
    address: 'Y5Z6...A7B8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 45600,
    change24h: -28,
    creatorRewardsSOL: 0.11
  },
  {
    id: 'equity-1',
    name: 'EQUITY a small business.',
    ticker: 'EQUITY',
    address: 'C9D0...E1F2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 6020,
    change24h: 7,
    creatorRewardsSOL: 0.03
  },
  {
    id: 'bottom-1',
    name: 'BOTTOM Generational Bottom',
    ticker: 'BOTTOM',
    address: 'G3H4...I5J6',
    logoUrl: '/images/placeholder-token.png',
    mcap: 212000,
    change24h: 11,
    creatorRewardsSOL: 0.18
  },
  {
    id: 'bond1-1',
    name: 'BOND Token One',
    ticker: 'BOND1',
    address: 'K7L8...M9N0',
    logoUrl: '/images/placeholder-token.png',
    mcap: 35000,
    change24h: -15,
    creatorRewardsSOL: 0.14
  },
  {
    id: 'bond2-1',
    name: 'BOND Token Two',
    ticker: 'BOND2',
    address: 'O1P2...Q3R4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 28000,
    change24h: 18,
    creatorRewardsSOL: 0.11
  },
  {
    id: 'bond3-1',
    name: 'BOND Token Three',
    ticker: 'BOND3',
    address: 'S5T6...U7V8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 42000,
    change24h: -8,
    creatorRewardsSOL: 0.16
  },
  {
    id: 'bond4-1',
    name: 'BOND Token Four',
    ticker: 'BOND4',
    address: 'W9X0...Y1Z2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 38000,
    change24h: 22,
    creatorRewardsSOL: 0.13
  },
  {
    id: 'bond5-1',
    name: 'BOND Token Five',
    ticker: 'BOND5',
    address: 'A3B4...C5D6',
    logoUrl: '/images/placeholder-token.png',
    mcap: 52000,
    change24h: -12,
    creatorRewardsSOL: 0.17
  },
  {
    id: 'bond6-1',
    name: 'BOND Token Six',
    ticker: 'BOND6',
    address: 'E7F8...G9H0',
    logoUrl: '/images/placeholder-token.png',
    mcap: 44000,
    change24h: 9,
    creatorRewardsSOL: 0.15
  },
  {
    id: 'bond7-1',
    name: 'BOND Token Seven',
    ticker: 'BOND7',
    address: 'I1J2...K3L4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 36000,
    change24h: -18,
    creatorRewardsSOL: 0.12
  },
  {
    id: 'bond8-1',
    name: 'BOND Token Eight',
    ticker: 'BOND8',
    address: 'M5N6...O7P8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 48000,
    change24h: 14,
    creatorRewardsSOL: 0.20
  }
];

const bondedTokens: Token[] = [
  {
    id: 'grg-1',
    name: 'GRG Good Run Games',
    ticker: 'GRG',
    address: 'Y5Z6...A7B8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 106000,
    change24h: -43,
    creatorRewardsSOL: 0.25
  },
  {
    id: 'glm-1',
    name: 'GLM Gooner Language Model',
    ticker: 'GLM',
    address: 'C9D0...E1F2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 87700,
    change24h: -30,
    creatorRewardsSOL: 0.18
  },
  {
    id: '41coin-1',
    name: '41 41COIN',
    ticker: '41',
    address: 'G3H4...I5J6',
    logoUrl: '/images/placeholder-token.png',
    mcap: 45300,
    change24h: -46,
    creatorRewardsSOL: 0.14
  },
  {
    id: 'cof-1',
    name: 'COF Church Of Famera',
    ticker: 'COF',
    address: 'K7L8...M9N0',
    logoUrl: '/images/placeholder-token.png',
    mcap: 21900,
    change24h: -28,
    creatorRewardsSOL: 0.09
  },
  {
    id: 'pilotlabs-1',
    name: 'PILOTLABS New Copilot Al Ass',
    ticker: 'PILOT',
    address: 'O1P2...Q3R4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 18700,
    change24h: -35,
    creatorRewardsSOL: 0.12
  },
  {
    id: 'copilot-1',
    name: 'Copilot Copilot',
    ticker: 'COPILOT',
    address: 'S5T6...U7V8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 32400,
    change24h: -22,
    creatorRewardsSOL: 0.16
  },
  {
    id: 'ai-1',
    name: 'AI Artificial Intelligence',
    ticker: 'AI',
    address: 'W9X0...Y1Z2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 156000,
    change24h: -19,
    creatorRewardsSOL: 0.28
  },
  {
    id: 'bonded1-1',
    name: 'BONDED Token One',
    ticker: 'BONDED1',
    address: 'A1B2...C3D4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 75000,
    change24h: 12,
    creatorRewardsSOL: 0.22
  },
  {
    id: 'bonded2-1',
    name: 'BONDED Token Two',
    ticker: 'BONDED2',
    address: 'E5F6...G7H8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 68000,
    change24h: -5,
    creatorRewardsSOL: 0.19
  },
  {
    id: 'bonded3-1',
    name: 'BONDED Token Three',
    ticker: 'BONDED3',
    address: 'I9J0...K1L2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 92000,
    change24h: 33,
    creatorRewardsSOL: 0.31
  },
  {
    id: 'bonded4-1',
    name: 'BONDED Token Four',
    ticker: 'BONDED4',
    address: 'M3N4...O5P6',
    logoUrl: '/images/placeholder-token.png',
    mcap: 85000,
    change24h: -7,
    creatorRewardsSOL: 0.26
  },
  {
    id: 'bonded5-1',
    name: 'BONDED Token Five',
    ticker: 'BONDED5',
    address: 'Q7R8...S9T0',
    logoUrl: '/images/placeholder-token.png',
    mcap: 72000,
    change24h: 19,
    creatorRewardsSOL: 0.23
  },
  {
    id: 'bonded6-1',
    name: 'BONDED Token Six',
    ticker: 'BONDED6',
    address: 'U1V2...W3X4',
    logoUrl: '/images/placeholder-token.png',
    mcap: 95000,
    change24h: -11,
    creatorRewardsSOL: 0.29
  },
  {
    id: 'bonded7-1',
    name: 'BONDED Token Seven',
    ticker: 'BONDED7',
    address: 'Y5Z6...A7B8',
    logoUrl: '/images/placeholder-token.png',
    mcap: 81000,
    change24h: 16,
    creatorRewardsSOL: 0.25
  },
  {
    id: 'bonded8-1',
    name: 'BONDED Token Eight',
    ticker: 'BONDED8',
    address: 'C9D0...E1F2',
    logoUrl: '/images/placeholder-token.png',
    mcap: 88000,
    change24h: -3,
    creatorRewardsSOL: 0.27
  }
];

const ExplorePage: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  return (
    <div className="h-screen bg-background-dark flex flex-col overflow-hidden">
      {/* Header */}
      <Header currentPath="/explore" />
      
      {/* Page Content - Takes remaining height */}
      <div className="flex-1 flex flex-col pt-16 px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
        {/* Page Heading */}
        <div className="pt-6 pb-4 flex-shrink-0">
          <h1 className="text-xl font-bold text-text-primary">Explore</h1>
        </div>
        
        {/* Columns - Flex layout to enable per-column scrolling */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0">
          <div className="flex-1 min-h-0 min-w-0">
            <TokenColumn 
              title="New Pairs" 
              tokens={newPairsTokens} 
              icon="⚡" 
              metricValue="0.05" 
              filters={['P1', 'P2', 'P3']} 
              selectedFilters={selectedFilters} 
              onFilterChange={setSelectedFilters} 
            />
          </div>
          <div className="flex-1 min-h-0 min-w-0">
            <TokenColumn 
              title="About to Bond" 
              tokens={aboutToBondTokens} 
              icon="⏰" 
              metricValue="0" 
              filters={['P1', 'P2', 'P3']} 
              selectedFilters={selectedFilters} 
              onFilterChange={setSelectedFilters} 
            />
          </div>
          <div className="flex-1 min-h-0 min-w-0">
            <TokenColumn 
              title="Bonded" 
              tokens={bondedTokens} 
              icon="🔗" 
              metricValue="0" 
              filters={['P1', 'P2', 'P3']} 
              selectedFilters={selectedFilters} 
              onFilterChange={setSelectedFilters} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
