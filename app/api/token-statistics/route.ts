import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('contract_address');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sort_by') || 'mcap';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const minLiquidity = searchParams.get('min_liquidity');
    const minHolders = searchParams.get('min_holders');
    const verifiedOnly = searchParams.get('verified_only') === 'true';

    console.log('📊 Fetching token statistics with params:', {
      contractAddress,
      limit,
      offset,
      sortBy,
      sortOrder,
      minLiquidity,
      minHolders,
      verifiedOnly
    });

    let query = supabase
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
      `);

    // Filter by contract address if provided
    if (contractAddress) {
      query = query.eq('contract_address', contractAddress);
    }

    // Apply filters
    if (minLiquidity) {
      query = query.gte('liquidity', parseFloat(minLiquidity));
    }

    if (minHolders) {
      query = query.gte('holder_count', parseInt(minHolders));
    }

    if (verifiedOnly) {
      query = query.eq('is_verified', true);
    }

    // Apply sorting
    const validSortFields = ['mcap', 'liquidity', 'holder_count', 'fdv', 'usd_price', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'mcap';
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    query = query.order(finalSortBy, { ascending: finalSortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: statistics, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching token statistics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch token statistics', details: error },
        { status: 500 }
      );
    }

    // Transform the data to include both token and statistics info
    const transformedData = statistics?.map(stat => ({
      ...stat,
      token: stat.tokens,
      // Add computed fields
      price_change_24h: stat.stats_24h?.priceChange || 0,
      volume_24h: (stat.stats_24h?.buyVolume || 0) + (stat.stats_24h?.sellVolume || 0),
      organic_volume_24h: (stat.stats_24h?.buyOrganicVolume || 0) + (stat.stats_24h?.sellOrganicVolume || 0),
      trades_24h: (stat.stats_24h?.numBuys || 0) + (stat.stats_24h?.numSells || 0),
      traders_24h: stat.stats_24h?.numTraders || 0,
    })) || [];

    console.log(`✅ Fetched ${transformedData.length} token statistics`);

    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: {
        limit,
        offset,
        total: count || transformedData.length,
        has_more: (count || 0) > offset + limit
      },
      filters: {
        contract_address: contractAddress || null,
        min_liquidity: minLiquidity || null,
        min_holders: minHolders || null,
        verified_only: verifiedOnly,
        sort_by: finalSortBy,
        sort_order: finalSortOrder
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching token statistics:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
