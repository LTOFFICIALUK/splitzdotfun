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

    // 9. Update Leaderboards
    const timePeriods = ['24h', '7d', '30d', 'all_time'];
    for (const period of timePeriods) {
      try {
        console.log(`📊 Calculating leaderboard for ${period}...`);
        const leaderboardData = await calculateLeaderboardForPeriod(period);
        
        await updateStatWithJSON(`leaderboard_${period}`, leaderboardData.length, JSON.stringify(leaderboardData));
        results.push({ stat: `leaderboard_${period}`, success: true, count: leaderboardData.length });
        console.log(`✅ ${period} leaderboard updated with ${leaderboardData.length} entries`);
      } catch (error) {
        console.error(`❌ Error calculating ${period} leaderboard:`, error);
        results.push({ stat: `leaderboard_${period}`, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // 10. Update Total Royalties Earned (from token_ownership)
    try {
      const { data: earnedData, error: earnedError } = await supabase
        .from('token_ownership')
        .select('total_fees_earned');

      if (earnedError) throw earnedError;

      const totalEarned = earnedData?.reduce((sum, ownership) => sum + (ownership.total_fees_earned || 0), 0) || 0;
      
      await updateStat('total_royalties_earned', totalEarned, formatCurrency(totalEarned));
      results.push({ stat: 'total_royalties_earned', success: true, value: totalEarned });
    } catch (error) {
      console.error('❌ Error updating total royalties earned:', error);
      results.push({ stat: 'total_royalties_earned', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 11. Update Total Royalties Distributed (from royalty_payouts)
    try {
      const { data: distributedData, error: distributedError } = await supabase
        .from('royalty_payouts')
        .select('payout_amount_usd')
        .eq('transaction_status', 'confirmed')
        .not('payout_amount_usd', 'is', null);

      if (distributedError) throw distributedError;

      const totalDistributed = distributedData?.reduce((sum, payout) => sum + (payout.payout_amount_usd || 0), 0) || 0;
      
      await updateStat('total_royalties_distributed', totalDistributed, formatCurrency(totalDistributed));
      results.push({ stat: 'total_royalties_distributed', success: true, value: totalDistributed });
    } catch (error) {
      console.error('❌ Error updating total royalties distributed:', error);
      results.push({ stat: 'total_royalties_distributed', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 12. Update Total Earners
    try {
      const { data: earnersData, error: earnersError } = await supabase
        .from('royalty_payouts')
        .select('royalty_earner_social_or_wallet')
        .eq('transaction_status', 'confirmed');

      if (earnersError) throw earnersError;

      // Count unique earners
      const uniqueEarners = new Set(earnersData?.map(payout => payout.royalty_earner_social_or_wallet) || []);
      const totalEarners = uniqueEarners.size;
      
      await updateStat('total_earners', totalEarners, totalEarners.toString());
      results.push({ stat: 'total_earners', success: true, value: totalEarners });
    } catch (error) {
      console.error('❌ Error updating total earners:', error);
      results.push({ stat: 'total_earners', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 13. Update Top Earner
    try {
      const { data: topEarnerData, error: topEarnerError } = await supabase
        .from('royalty_payouts')
        .select('royalty_earner_social_or_wallet, payout_amount_usd')
        .eq('transaction_status', 'confirmed')
        .not('payout_amount_usd', 'is', null);

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
      
      await updateStat('top_earner', topEarnerValue, topEarnerName);
      results.push({ stat: 'top_earner', success: true, value: topEarnerName });
    } catch (error) {
      console.error('❌ Error updating top earner:', error);
      results.push({ stat: 'top_earner', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 14. Update Time-Period Specific Stats
    const timePeriodsForStats = ['24h', '7d', '30d', 'all_time'];
    for (const period of timePeriodsForStats) {
      try {
        console.log(`📊 Calculating time-period stats for ${period}...`);
        const periodStats = await calculateTimePeriodStats(period);
        
        await updateStatWithJSON(`stats_${period}`, periodStats.totalDistributed, JSON.stringify(periodStats));
        results.push({ stat: `stats_${period}`, success: true, count: periodStats.totalEarners });
        console.log(`✅ ${period} stats updated`);
      } catch (error) {
        console.error(`❌ Error calculating ${period} stats:`, error);
        results.push({ stat: `stats_${period}`, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
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

async function updateStatWithJSON(statKey: string, numericValue: number, jsonValue: string) {
  const nextUpdate = new Date();
  nextUpdate.setMinutes(nextUpdate.getMinutes() + 5); // Update every 5 minutes

  const { error } = await supabase
    .from('stats_cache')
    .upsert({
      stat_key: statKey,
      value_numeric: numericValue,
      value_json: jsonValue,
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

async function calculateLeaderboardForPeriod(timePeriod: string) {
  // Calculate date range based on time period
  const now = new Date();
  let startDate: Date | null = null;
  
  switch (timePeriod) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all_time':
      startDate = null; // No start date for all time
      break;
    default:
      throw new Error(`Invalid time period: ${timePeriod}`);
  }

  // Build query for royalty payouts
  let query = supabase
    .from('royalty_payouts')
    .select(`
      royalty_earner_social_or_wallet,
      royalty_role,
      payout_amount,
      payout_amount_usd,
      claimed_at,
      token_id,
      token:tokens(name, symbol)
    `)
    .eq('transaction_status', 'confirmed')
    .not('payout_amount_usd', 'is', null);

  // Add date filter if not all_time
  if (startDate) {
    query = query.gte('claimed_at', startDate.toISOString());
  }

  const { data: payouts, error } = await query;

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  if (!payouts || payouts.length === 0) {
    return [];
  }

  // Group payouts by royalty earner
  const earnerStats = new Map<string, {
    social_or_wallet: string;
    roles: Set<string>;
    totalSol: number;
    totalUsd: number;
    payoutCount: number;
    tokens: Set<string>;
    tokenEarnings: Map<string, number>;
    payouts: Array<{
      amount: number;
      claimed_at: string;
      token_id: string;
      token_name: string;
      token_symbol: string;
    }>;
  }>();

  // Process each payout
  for (const payout of payouts) {
    const earner = payout.royalty_earner_social_or_wallet;
    const amount = payout.payout_amount_usd || 0;
    const solAmount = payout.payout_amount || 0;

    if (!earnerStats.has(earner)) {
      earnerStats.set(earner, {
        social_or_wallet: earner,
        roles: new Set(),
        totalSol: 0,
        totalUsd: 0,
        payoutCount: 0,
        tokens: new Set(),
        tokenEarnings: new Map(),
        payouts: []
      });
    }

    const stats = earnerStats.get(earner)!;
    stats.roles.add(payout.royalty_role);
    stats.totalSol += solAmount;
    stats.totalUsd += amount;
    stats.payoutCount++;
    stats.tokens.add(payout.token_id);
    
    // Track earnings per token
    const currentTokenEarnings = stats.tokenEarnings.get(payout.token_id) || 0;
    stats.tokenEarnings.set(payout.token_id, currentTokenEarnings + amount);
    
    // Track payout details
    stats.payouts.push({
      amount,
      claimed_at: payout.claimed_at,
      token_id: payout.token_id,
      token_name: payout.token?.name || 'Unknown',
      token_symbol: payout.token?.symbol || 'Unknown'
    });
  }

  // Convert to array and sort by total USD earnings
  const sortedEarners = Array.from(earnerStats.values())
    .sort((a, b) => b.totalUsd - a.totalUsd);

  // Prepare leaderboard entries (limit to top 50)
  const leaderboardEntries = sortedEarners.slice(0, 50).map((earner, index) => {
    const rank = index + 1;
    
    // Find top token (highest earnings)
    let topTokenId = null;
    let topTokenName = null;
    let topTokenSymbol = null;
    let maxTokenEarnings = 0;
    
    for (const [tokenId, earnings] of earner.tokenEarnings) {
      if (earnings > maxTokenEarnings) {
        maxTokenEarnings = earnings;
        const topPayout = earner.payouts.find(p => p.token_id === tokenId);
        topTokenId = tokenId;
        topTokenName = topPayout?.token_name || null;
        topTokenSymbol = topPayout?.token_symbol || null;
      }
    }

    // Calculate additional metrics
    const averagePayout = earner.totalUsd / earner.payoutCount;
    const largestPayout = Math.max(...earner.payouts.map(p => p.amount));
    const mostRecentPayout = earner.payouts
      .sort((a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime())[0];

    return {
      time_period: timePeriod,
      rank_position: rank,
      royalty_earner_social_or_wallet: earner.social_or_wallet,
      royalty_role: Array.from(earner.roles)[0] || null,
      total_earnings_sol: earner.totalSol,
      total_earnings_usd: earner.totalUsd,
      payout_count: earner.payoutCount,
      tokens_earned_from: earner.tokens.size,
      top_token_id: topTokenId,
      top_token_name: topTokenName,
      top_token_symbol: topTokenSymbol,
      period_start: startDate?.toISOString() || null,
      period_end: now.toISOString(),
      average_payout_usd: averagePayout,
      largest_single_payout_usd: largestPayout,
      most_recent_payout_at: mostRecentPayout?.claimed_at || null
    };
  });

  return leaderboardEntries;
}

async function calculateTimePeriodStats(timePeriod: string) {
  // Calculate date range based on time period
  const now = new Date();
  let startDate: Date | null = null;
  
  switch (timePeriod) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all_time':
      startDate = null; // No start date for all time
      break;
    default:
      throw new Error(`Invalid time period: ${timePeriod}`);
  }

  // Get royalties earned for this period (from token_ownership)
  let earnedQuery = supabase
    .from('token_ownership')
    .select('total_fees_earned, updated_at');

  if (startDate) {
    earnedQuery = earnedQuery.gte('updated_at', startDate.toISOString());
  }

  const { data: earnedData, error: earnedError } = await earnedQuery;
  if (earnedError) throw earnedError;

  const totalEarned = earnedData?.reduce((sum, ownership) => sum + (ownership.total_fees_earned || 0), 0) || 0;

  // Get royalties distributed for this period (from royalty_payouts)
  let distributedQuery = supabase
    .from('royalty_payouts')
    .select('payout_amount_usd, royalty_earner_social_or_wallet')
    .eq('transaction_status', 'confirmed')
    .not('payout_amount_usd', 'is', null);

  if (startDate) {
    distributedQuery = distributedQuery.gte('claimed_at', startDate.toISOString());
  }

  const { data: distributedData, error: distributedError } = await distributedQuery;
  if (distributedError) throw distributedError;

  const totalDistributed = distributedData?.reduce((sum, payout) => sum + (payout.payout_amount_usd || 0), 0) || 0;

  // Count unique earners for this period
  const uniqueEarners = new Set(distributedData?.map(payout => payout.royalty_earner_social_or_wallet) || []);
  const totalEarners = uniqueEarners.size;

  // Find top earner for this period
  const earnerTotals = new Map<string, number>();
  distributedData?.forEach(payout => {
    const earner = payout.royalty_earner_social_or_wallet;
    const current = earnerTotals.get(earner) || 0;
    earnerTotals.set(earner, current + (payout.payout_amount_usd || 0));
  });

  const topEarner = Array.from(earnerTotals.entries())
    .sort(([,a], [,b]) => b - a)[0];

  const topEarnerName = topEarner ? topEarner[0] : 'None';
  const topEarnerAmount = topEarner ? topEarner[1] : 0;

  return {
    totalEarned,
    totalDistributed,
    totalEarners,
    topEarner: topEarnerName,
    topEarnerAmount,
    period: timePeriod,
    periodLabel: timePeriod === '24h' ? '24 Hours' : 
                 timePeriod === '7d' ? '7 Days' : 
                 timePeriod === '30d' ? '30 Days' : 'All Time'
  };
}
