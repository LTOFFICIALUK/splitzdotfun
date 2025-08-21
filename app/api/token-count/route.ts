import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🪙 Fetching total token count...');

    // Get total count of all tokens
    const { count: totalTokens, error: countError } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting tokens:', countError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error counting tokens',
          details: countError 
        },
        { status: 500 }
      );
    }

    // Get count of verified tokens
    const { count: verifiedTokens, error: verifiedError } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true);

    if (verifiedError) {
      console.error('❌ Error counting verified tokens:', verifiedError);
    }

    // Get count of tokens launched in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentTokens, error: recentError } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) {
      console.error('❌ Error counting recent tokens:', recentError);
    }

    console.log('✅ Total tokens:', totalTokens);

    return NextResponse.json({
      success: true,
      total_tokens: totalTokens || 0,
      verified_tokens: verifiedTokens || 0,
      recent_tokens: recentTokens || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching token count:', error);
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
