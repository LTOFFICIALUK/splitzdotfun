import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExplorePageResponse } from '@/types/explore-page';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fetch explore page data from cache
const fetchExplorePageData = async (): Promise<ExplorePageResponse> => {
  try {
    // Fetch tokens by category with ordering
    const { data: newTokens, error: newError } = await supabase
      .from('explore_page')
      .select('*')
      .eq('category', 'new')
      .order('market_cap', { ascending: false })
      .limit(15);

    const { data: last24Hours, error: last24Error } = await supabase
      .from('explore_page')
      .select('*')
      .eq('category', '24h')
      .order('volume_24h', { ascending: false })
      .limit(15);

    const { data: olderTokens, error: olderError } = await supabase
      .from('explore_page')
      .select('*')
      .eq('category', 'older')
      .order('market_cap', { ascending: false })
      .limit(15);

    if (newError || last24Error || olderError) {
      throw new Error(`Database error: ${newError?.message || last24Error?.message || olderError?.message}`);
    }

    // Get the most recent update timestamp
    const { data: lastUpdate, error: updateError } = await supabase
      .from('explore_page')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1);

    if (updateError) {
      console.warn('Failed to get last update timestamp:', updateError);
    }

    return {
      newTokens: newTokens || [],
      last24Hours: last24Hours || [],
      olderTokens: olderTokens || [],
      lastUpdated: lastUpdate?.[0]?.last_updated || new Date().toISOString()
    };

  } catch (error) {
    console.error('Error fetching explore page data:', error);
    throw error;
  }
};

// API route handler
export async function GET() {
  try {
    const data = await fetchExplorePageData();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });

  } catch (error) {
    console.error('Error in explore-data API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
