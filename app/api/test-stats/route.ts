import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 Testing stats calculations...');

    // 1. Test Total Tokens Launched
    const { count: tokenCount, error: tokenError } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true });

    if (tokenError) {
      console.error('❌ Token count error:', tokenError);
    }

    // 2. Test Total Active Holders
    const { data: holderData, error: holderError } = await supabase
      .from('token_statistics')
      .select('holder_count')
      .not('holder_count', 'is', null);

    if (holderError) {
      console.error('❌ Holder count error:', holderError);
    }

    const totalHolders = holderData?.reduce((sum, stat) => sum + (stat.holder_count || 0), 0) || 0;

    // 3. Test Total Royalty Earners
    const { data: ownershipData, error: ownershipError } = await supabase
      .from('token_ownership')
      .select('royalty_earners')
      .not('royalty_earners', 'is', null);

    if (ownershipError) {
      console.error('❌ Ownership error:', ownershipError);
    }

    // Count all unique earners from all tokens
    const allEarners = new Set<string>();
    ownershipData?.forEach(ownership => {
      if (ownership.royalty_earners && Array.isArray(ownership.royalty_earners)) {
        ownership.royalty_earners.forEach((earner: any) => {
          if (earner && typeof earner === 'string') {
            allEarners.add(earner);
          } else if (earner && typeof earner === 'object' && earner.social_or_wallet) {
            allEarners.add(earner.social_or_wallet);
          }
        });
      }
    });

    const totalEarners = allEarners.size;

    return NextResponse.json({
      success: true,
      stats: {
        total_tokens_launched: tokenCount || 0,
        total_active_holders: totalHolders,
        total_royalty_earners: totalEarners,
        holder_data_count: holderData?.length || 0,
        ownership_data_count: ownershipData?.length || 0,
        sample_holder_data: holderData?.slice(0, 3) || [],
        sample_ownership_data: ownershipData?.slice(0, 3) || []
      }
    });

  } catch (error) {
    console.error('❌ Test stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
