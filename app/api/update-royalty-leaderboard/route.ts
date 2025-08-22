import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🏆 Updating royalty leaderboard...');

    // Check authorization (optional - for cron job security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Only check authorization if CRON_SECRET is set
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('⚠️ Unauthorized leaderboard update attempt');
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn('⚠️ CRON_SECRET not set - skipping authorization check');
    }

    const timePeriods = ['24h', '7d', '30d', 'all_time'];
    const results = [];

    for (const period of timePeriods) {
      console.log(`📊 Calculating leaderboard for ${period}...`);
      
      try {
        const result = await calculateLeaderboardForPeriod(period);
        results.push({ period, success: true, count: result.length });
        console.log(`✅ ${period} leaderboard updated with ${result.length} entries`);
      } catch (error) {
        console.error(`❌ Error calculating ${period} leaderboard:`, error);
        results.push({ period, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Royalty leaderboard updated',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error updating leaderboard:', error);
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
    // No payouts for this period, clear existing leaderboard
    await supabase
      .from('royalty_leaderboard')
      .delete()
      .eq('time_period', timePeriod);
    
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
    // Handle token data - it might be an array from the join
    const tokenData = Array.isArray(payout.token) ? payout.token[0] : payout.token;
    stats.payouts.push({
      amount,
      claimed_at: payout.claimed_at,
      token_id: payout.token_id,
      token_name: tokenData?.name || 'Unknown',
      token_symbol: tokenData?.symbol || 'Unknown'
    });
  }

  // Convert to array and sort by total USD earnings
  const sortedEarners = Array.from(earnerStats.values())
    .sort((a, b) => b.totalUsd - a.totalUsd);

  // Prepare leaderboard entries
  const leaderboardEntries = sortedEarners.map((earner, index) => {
    const rank = index + 1;
    
    // Find top token (highest earnings)
    let topTokenId = null;
    let topTokenName = null;
    let topTokenSymbol = null;
    let maxTokenEarnings = 0;
    
    // Use Array.from to avoid TypeScript iteration issues
    const tokenEarningsArray = Array.from(earner.tokenEarnings.entries());
    for (let i = 0; i < tokenEarningsArray.length; i++) {
      const [tokenId, earnings] = tokenEarningsArray[i];
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
      royalty_role: Array.from(earner.roles)[0] || null, // Most common role
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

  // Clear existing leaderboard for this period
  await supabase
    .from('royalty_leaderboard')
    .delete()
    .eq('time_period', timePeriod);

  // Insert new leaderboard entries (limit to top 100)
  const topEntries = leaderboardEntries.slice(0, 100);
  if (topEntries.length > 0) {
    const { error: insertError } = await supabase
      .from('royalty_leaderboard')
      .insert(topEntries);

    if (insertError) {
      throw new Error(`Insert error: ${insertError.message}`);
    }
  }

  return topEntries;
}
