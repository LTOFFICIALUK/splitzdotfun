import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📊 Updating stats cache...');

    // Check authorization (optional - for cron job security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('⚠️ Unauthorized stats cache update attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    // 1. Update Total Royalties Claimed (USD)
    try {
      const { data: royaltiesData, error: royaltiesError } = await supabase
        .from('royalty_payouts')
        .select('payout_amount_usd')
        .eq('transaction_status', 'confirmed')
        .not('payout_amount_usd', 'is', null);

      if (royaltiesError) throw royaltiesError;

      const totalRoyalties = royaltiesData?.reduce((sum, payout) => sum + (payout.payout_amount_usd || 0), 0) || 0;
      
      await updateStat('total_royalties_claimed_usd', totalRoyalties, formatCurrency(totalRoyalties));
      results.push({ stat: 'total_royalties_claimed_usd', success: true, value: totalRoyalties });
    } catch (error) {
      console.error('❌ Error updating total royalties:', error);
      results.push({ stat: 'total_royalties_claimed_usd', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 2. Update Total Tokens Launched
    try {
      const { count: tokenCount, error: tokenError } = await supabase
        .from('tokens')
        .select('*', { count: 'exact', head: true });

      if (tokenError) throw tokenError;

      await updateStat('total_tokens_launched', tokenCount || 0, (tokenCount || 0).toString());
      results.push({ stat: 'total_tokens_launched', success: true, value: tokenCount || 0 });
    } catch (error) {
      console.error('❌ Error updating total tokens:', error);
      results.push({ stat: 'total_tokens_launched', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 3. Update Total Active Holders
    try {
      const { data: holderData, error: holderError } = await supabase
        .from('token_statistics')
        .select('holder_count')
        .not('holder_count', 'is', null);

      if (holderError) throw holderError;

      const totalHolders = holderData?.reduce((sum, stat) => sum + (stat.holder_count || 0), 0) || 0;
      
      await updateStat('total_active_holders', totalHolders, formatNumber(totalHolders));
      results.push({ stat: 'total_active_holders', success: true, value: totalHolders });
    } catch (error) {
      console.error('❌ Error updating total holders:', error);
      results.push({ stat: 'total_active_holders', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 4. Update Total Royalty Earners
    try {
      const { count: earnerCount, error: earnerError } = await supabase
        .from('royalty_payouts')
        .select('royalty_earner_social_or_wallet', { count: 'exact', head: true })
        .eq('transaction_status', 'confirmed');

      if (earnerError) throw earnerError;

      await updateStat('total_royalty_earners', earnerCount || 0, (earnerCount || 0).toString());
      results.push({ stat: 'total_royalty_earners', success: true, value: earnerCount || 0 });
    } catch (error) {
      console.error('❌ Error updating total earners:', error);
      results.push({ stat: 'total_royalty_earners', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 5. Update Average Earnings per Earner
    try {
      const { data: avgData, error: avgError } = await supabase
        .from('royalty_payouts')
        .select('payout_amount_usd')
        .eq('transaction_status', 'confirmed')
        .not('payout_amount_usd', 'is', null);

      if (avgError) throw avgError;

      const totalEarnings = avgData?.reduce((sum, payout) => sum + (payout.payout_amount_usd || 0), 0) || 0;
      const payoutCount = avgData?.length || 0;
      const averageEarnings = payoutCount > 0 ? totalEarnings / payoutCount : 0;
      
      await updateStat('average_earnings_per_earner', averageEarnings, formatCurrency(averageEarnings));
      results.push({ stat: 'average_earnings_per_earner', success: true, value: averageEarnings });
    } catch (error) {
      console.error('❌ Error updating average earnings:', error);
      results.push({ stat: 'average_earnings_per_earner', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 6. Update Top Earner This Week
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: topEarnerData, error: topEarnerError } = await supabase
        .from('royalty_payouts')
        .select('royalty_earner_social_or_wallet, payout_amount_usd')
        .eq('transaction_status', 'confirmed')
        .not('payout_amount_usd', 'is', null)
        .gte('claimed_at', weekAgo.toISOString());

      if (topEarnerError) throw topEarnerError;

      // Group by earner and sum earnings
      const earnerTotals = new Map<string, number>();
      topEarnerData?.forEach(payout => {
        const earner = payout.royalty_earner_social_or_wallet;
        const current = earnerTotals.get(earner) || 0;
        earnerTotals.set(earner, current + (payout.payout_amount_usd || 0));
      });

      const topEarner = Array.from(earnerTotals.entries())
        .sort(([,a], [,b]) => b - a)[0];

      const topEarnerValue = topEarner ? topEarner[1] : 0;
      const topEarnerName = topEarner ? topEarner[0] : 'None';
      
      await updateStat('top_earner_this_week', topEarnerValue, topEarnerName);
      results.push({ stat: 'top_earner_this_week', success: true, value: topEarnerName });
    } catch (error) {
      console.error('❌ Error updating top earner:', error);
      results.push({ stat: 'top_earner_this_week', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 7. Update Total Payouts This Week
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: weeklyPayouts, error: weeklyError } = await supabase
        .from('royalty_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('transaction_status', 'confirmed')
        .gte('claimed_at', weekAgo.toISOString());

      if (weeklyError) throw weeklyError;

      await updateStat('total_payouts_this_week', weeklyPayouts || 0, (weeklyPayouts || 0).toString());
      results.push({ stat: 'total_payouts_this_week', success: true, value: weeklyPayouts || 0 });
    } catch (error) {
      console.error('❌ Error updating weekly payouts:', error);
      results.push({ stat: 'total_payouts_this_week', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 8. Update Platform Fees Collected
    try {
      const { data: feesData, error: feesError } = await supabase
        .from('royalty_payouts')
        .select('platform_fee')
        .eq('transaction_status', 'confirmed');

      if (feesError) throw feesError;

      const totalFees = feesData?.reduce((sum, payout) => sum + (payout.platform_fee || 0), 0) || 0;
      
      await updateStat('platform_fees_collected', totalFees, formatCurrency(totalFees));
      results.push({ stat: 'platform_fees_collected', success: true, value: totalFees });
    } catch (error) {
      console.error('❌ Error updating platform fees:', error);
      results.push({ stat: 'platform_fees_collected', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    console.log('✅ Stats cache updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Stats cache updated',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error updating stats cache:', error);
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

async function updateStat(statKey: string, numericValue: number, textValue: string) {
  const nextUpdate = new Date();
  nextUpdate.setMinutes(nextUpdate.getMinutes() + 5); // Update every 5 minutes

  const { error } = await supabase
    .from('stats_cache')
    .upsert({
      stat_key: statKey,
      value_numeric: numericValue,
      value_text: textValue,
      last_calculated: new Date().toISOString(),
      next_update: nextUpdate.toISOString()
    });

  if (error) {
    throw new Error(`Failed to update stat ${statKey}: ${error.message}`);
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return `$${amount.toFixed(0)}`;
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return num.toLocaleString();
  }
}
