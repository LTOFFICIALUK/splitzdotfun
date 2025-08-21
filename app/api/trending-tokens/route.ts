import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    console.log('📊 Fetching trending tokens based on 1-hour volume...');

    // Query to get tokens with highest 1-hour volume
    // We'll use sellVolume from stats_1h as the primary metric
    // If stats_1h is null, we'll fall back to 24h volume
    const { data: trendingTokens, error } = await supabase
      .from('token_statistics')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          image_url,
          social_link,
          created_at,
          fees_generated
        )
      `)
      .not('stats_1h', 'is', null) // Only tokens with 1h stats
      .order('stats_1h->sellVolume', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching trending tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trending tokens', details: error },
        { status: 500 }
      );
    }

    // Transform the data to match the Token interface
    const transformedTokens = trendingTokens?.map((stat, index) => {
      let stats1h = null;
      let stats24h = null;
      
      try {
        if (stat.stats_1h && typeof stat.stats_1h === 'string') {
          stats1h = JSON.parse(stat.stats_1h);
        } else if (stat.stats_1h && typeof stat.stats_1h === 'object') {
          stats1h = stat.stats_1h;
        }
        
        if (stat.stats_24h && typeof stat.stats_24h === 'string') {
          stats24h = JSON.parse(stat.stats_24h);
        } else if (stat.stats_24h && typeof stat.stats_24h === 'object') {
          stats24h = stat.stats_24h;
        }
      } catch (error) {
        console.warn(`Failed to parse stats for token ${stat.contract_address}:`, error);
      }
      
      // Calculate total volume (use sellVolume from 1h, or total from 24h as fallback)
      let volume1h = 0;
      if (stats1h && stats1h.sellVolume) {
        volume1h = stats1h.sellVolume;
      } else if (stats24h && stats24h.buyVolume && stats24h.sellVolume) {
        // If no 1h data, use 24h volume divided by 24 as approximation
        volume1h = (stats24h.buyVolume + stats24h.sellVolume) / 24;
      }

      return {
        id: stat.id,
        name: stat.name || stat.tokens?.name || 'Unknown',
        ticker: stat.symbol || stat.tokens?.symbol || 'UNKNOWN',
        address: stat.contract_address,
        logoUrl: stat.icon || stat.tokens?.image_url || '/images/placeholder-token.png',
        mcap: stat.mcap || 0,
        change24h: stats24h?.priceChange || 0,
        creatorRewardsSOL: stat.tokens?.fees_generated || 0,
        // Additional data for trending calculation
        volume1h: volume1h,
        holder_count: stat.holder_count || 0,
        liquidity: stat.liquidity || 0,
        usd_price: stat.usd_price || 0,
        trending_rank: index + 1
      };
    }) || [];

    console.log(`✅ Fetched ${transformedTokens.length} trending tokens`);

    return NextResponse.json({
      success: true,
      data: transformedTokens,
      summary: {
        total: transformedTokens.length,
        metric: '1-hour volume (sellVolume)',
        note: 'Using sellVolume from stats_1h. For total volume, stats_24h has both buyVolume and sellVolume.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching trending tokens:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
