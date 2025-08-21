import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('👥 Fetching total holders count...');

    // Get all holder_count values from token_statistics
    const { data: tokenStats, error: statsError } = await supabase
      .from('token_statistics')
      .select('holder_count')
      .not('holder_count', 'is', null);

    if (statsError) {
      console.error('❌ Error fetching token statistics:', statsError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error fetching token statistics',
          details: statsError 
        },
        { status: 500 }
      );
    }

    // Calculate total holders by summing all holder_count values
    const totalHolders = tokenStats?.reduce((sum, stat) => {
      return sum + (stat.holder_count || 0);
    }, 0) || 0;

    // Get count of tokens with holder data
    const tokensWithHolders = tokenStats?.length || 0;

    // Get average holders per token
    const averageHolders = tokensWithHolders > 0 ? Math.round(totalHolders / tokensWithHolders) : 0;

    // Get tokens with highest holder counts (top 5)
    const { data: topTokens, error: topError } = await supabase
      .from('token_statistics')
      .select(`
        holder_count,
        token:tokens(name, symbol)
      `)
      .not('holder_count', 'is', null)
      .order('holder_count', { ascending: false })
      .limit(5);

    if (topError) {
      console.error('❌ Error fetching top tokens:', topError);
    }

    console.log('✅ Total holders:', totalHolders);

    return NextResponse.json({
      success: true,
      total_holders: totalHolders,
      tokens_with_holders: tokensWithHolders,
      average_holders_per_token: averageHolders,
      top_tokens_by_holders: topTokens || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching total holders:', error);
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
