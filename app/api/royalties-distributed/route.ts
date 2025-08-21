import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('💰 Fetching total royalties distributed...');

    // Get total royalties distributed (sum of all successful payouts)
    const { data: totalRoyalties, error: totalError } = await supabase
      .from('royalty_payouts')
      .select('payout_amount_usd')
      .eq('transaction_status', 'confirmed')
      .not('payout_amount_usd', 'is', null);

    if (totalError) {
      console.error('❌ Error fetching total royalties:', totalError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error fetching total royalties',
          details: totalError 
        },
        { status: 500 }
      );
    }

    // Calculate total from all confirmed payouts
    const totalDistributed = totalRoyalties?.reduce((sum, payout) => {
      return sum + (payout.payout_amount_usd || 0);
    }, 0) || 0;

    // Get count of successful payouts
    const { count: successfulPayouts, error: countError } = await supabase
      .from('royalty_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('transaction_status', 'confirmed');

    if (countError) {
      console.error('❌ Error counting successful payouts:', countError);
    }

    // Get recent payouts for additional context
    const { data: recentPayouts, error: recentError } = await supabase
      .from('royalty_payouts')
      .select(`
        id,
        payout_amount_usd,
        claimed_at,
        token:tokens(name, symbol)
      `)
      .eq('transaction_status', 'confirmed')
      .not('payout_amount_usd', 'is', null)
      .order('claimed_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Error fetching recent payouts:', recentError);
    }

    console.log('✅ Total royalties distributed:', totalDistributed);

    return NextResponse.json({
      success: true,
      total_distributed_usd: totalDistributed,
      successful_payouts: successfulPayouts || 0,
      recent_payouts: recentPayouts || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching royalties:', error);
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
