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
    const timePeriod = searchParams.get('period') || 'all_time';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate time period
    const validPeriods = ['24h', '7d', '30d', 'all_time'];
    if (!validPeriods.includes(timePeriod)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid time period',
          valid_periods: validPeriods
        },
        { status: 400 }
      );
    }

    console.log(`🏆 Fetching royalty leaderboard for ${timePeriod}...`);

    // Fetch leaderboard data
    const { data: leaderboard, error } = await supabase
      .from('royalty_leaderboard')
      .select('*')
      .eq('time_period', timePeriod)
      .order('rank_position', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching leaderboard:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error fetching leaderboard',
          details: error 
        },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('royalty_leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('time_period', timePeriod);

    if (countError) {
      console.error('❌ Error counting leaderboard entries:', countError);
    }

    // Get leaderboard metadata
    const { data: metadata, error: metadataError } = await supabase
      .from('royalty_leaderboard')
      .select('period_start, period_end, last_updated')
      .eq('time_period', timePeriod)
      .limit(1)
      .single();

    if (metadataError && metadataError.code !== 'PGRST116') {
      console.error('❌ Error fetching metadata:', metadataError);
    }

    console.log(`✅ Fetched ${leaderboard?.length || 0} leaderboard entries for ${timePeriod}`);

    return NextResponse.json({
      success: true,
      time_period: timePeriod,
      data: leaderboard || [],
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        has_more: (offset + limit) < (totalCount || 0)
      },
      metadata: metadata || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching leaderboard:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
