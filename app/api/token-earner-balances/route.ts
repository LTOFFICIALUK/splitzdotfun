import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('token_id');

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: 'token_id parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching earner balances for token: ${tokenId}`);

    // Get earner balances from view
    const { data: earnerBalances, error: balanceError } = await supabase
      .from('earner_token_balances_v')
      .select('*')
      .eq('token_id', tokenId)
      .gt('owed_total_lamports', 0) // Only show earners with outstanding balances
      .order('owed_total_lamports', { ascending: false });

    if (balanceError) {
      console.error('❌ Error fetching earner balances:', balanceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch earner balances', details: balanceError },
        { status: 500 }
      );
    }

    // Get token balance (treasury info)
    const { data: tokenBalance, error: tokenBalanceError } = await supabase
      .from('token_balances_v')
      .select('*')
      .eq('token_id', tokenId)
      .single();

    if (tokenBalanceError) {
      console.error('❌ Error fetching token balance:', tokenBalanceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch token balance', details: tokenBalanceError },
        { status: 500 }
      );
    }

    // Get token info
    const { data: tokenInfo, error: tokenError } = await supabase
      .from('tokens')
      .select('name, symbol, contract_address')
      .eq('id', tokenId)
      .single();

    if (tokenError) {
      console.error('❌ Error fetching token info:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch token info', details: tokenError },
        { status: 500 }
      );
    }

    // Get royalty earners info for additional context
    const { data: ownershipInfo, error: ownershipError } = await supabase
      .from('token_ownership')
      .select('royalty_earners')
      .eq('token_id', tokenId)
      .single();

    if (ownershipError) {
      console.error('❌ Error fetching ownership info:', ownershipError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ownership info', details: ownershipError },
        { status: 500 }
      );
    }

    // Enrich earner balances with royalty info
    const enrichedBalances = earnerBalances?.map(balance => {
      const royaltyEarners = ownershipInfo?.royalty_earners || [];
      const royaltyInfo = Array.isArray(royaltyEarners) 
        ? royaltyEarners.find(earner => 
            earner.social_or_wallet === balance.earner_wallet || 
            earner.wallet === balance.earner_wallet
          )
        : null;

      return {
        ...balance,
        royalty_role: royaltyInfo?.role || 'Earner',
        royalty_percentage: royaltyInfo?.percentage || 0,
        earned_sol: balance.earned_total_lamports / 1e9,
        paid_sol: balance.paid_total_lamports / 1e9,
        owed_sol: balance.owed_total_lamports / 1e9
      };
    }) || [];

    console.log(`✅ Found ${enrichedBalances.length} earners with outstanding balances`);

    return NextResponse.json({
      success: true,
      data: {
        token: {
          id: tokenId,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          contract_address: tokenInfo.contract_address
        },
        treasury_balance_sol: tokenBalance.treasury_liquid_balance_lamports / 1e9,
        treasury_balance_lamports: tokenBalance.treasury_liquid_balance_lamports,
        total_earned_sol: tokenBalance.earners_earned_lamports / 1e9,
        total_paid_sol: tokenBalance.distributed_to_earners_lamports / 1e9,
        total_owed_sol: (tokenBalance.earners_earned_lamports - tokenBalance.distributed_to_earners_lamports) / 1e9,
        earners: enrichedBalances
      }
    });

  } catch (error) {
    console.error('❌ Error in token-earner-balances:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
