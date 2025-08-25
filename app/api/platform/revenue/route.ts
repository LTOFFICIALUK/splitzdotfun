import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get platform revenue stats and summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const revenueType = searchParams.get('type'); // 'sale_fee' or 'token_fee'
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // Build query for platform revenue
    let query = supabase
      .from('platform_revenue')
      .select(`
        *,
        marketplace_sales (
          id,
          sale_price_sol,
          completed_at,
          tokens (
            name,
            symbol
          )
        ),
        token_fee_periods (
          id,
          period_start,
          period_end,
          total_fees_generated_sol,
          tokens (
            name,
            symbol
          )
        )
      `)
      .eq('status', 'collected');

    // Apply date filters
    if (startDate) {
      query = query.gte('collected_at', startDate);
    }
    if (endDate) {
      query = query.lte('collected_at', endDate);
    }

    // Apply revenue type filter
    if (revenueType && ['sale_fee', 'token_fee'].includes(revenueType)) {
      query = query.eq('revenue_type', revenueType);
    }

    const { data: revenue, error } = await query.order('collected_at', { ascending: false });

    if (error) {
      console.error('Error fetching platform revenue:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch platform revenue' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const summary = {
      totalRevenue: 0,
      saleFeeRevenue: 0,
      tokenFeeRevenue: 0,
      transactionCount: revenue?.length || 0,
      saleFeeCount: 0,
      tokenFeeCount: 0,
      dailyRevenue: {} as Record<string, number>,
      monthlyRevenue: {} as Record<string, number>
    };

    revenue?.forEach(item => {
      summary.totalRevenue += item.amount_sol;
      
      if (item.revenue_type === 'sale_fee') {
        summary.saleFeeRevenue += item.amount_sol;
        summary.saleFeeCount++;
      } else if (item.revenue_type === 'token_fee') {
        summary.tokenFeeRevenue += item.amount_sol;
        summary.tokenFeeCount++;
      }

      // Group by day
      const day = new Date(item.collected_at).toISOString().split('T')[0];
      summary.dailyRevenue[day] = (summary.dailyRevenue[day] || 0) + item.amount_sol;

      // Group by month
      const month = new Date(item.collected_at).toISOString().slice(0, 7); // YYYY-MM
      summary.monthlyRevenue[month] = (summary.monthlyRevenue[month] || 0) + item.amount_sol;
    });

    // Calculate additional stats
    const additionalStats = {
      averageRevenuePerTransaction: summary.transactionCount > 0 ? summary.totalRevenue / summary.transactionCount : 0,
      revenueGrowth: calculateRevenueGrowth(summary.dailyRevenue),
      topRevenueDays: Object.entries(summary.dailyRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([date, amount]) => ({ date, amount })),
      revenueByType: {
        sale_fee: {
          total: summary.saleFeeRevenue,
          count: summary.saleFeeCount,
          percentage: summary.totalRevenue > 0 ? (summary.saleFeeRevenue / summary.totalRevenue) * 100 : 0
        },
        token_fee: {
          total: summary.tokenFeeRevenue,
          count: summary.tokenFeeCount,
          percentage: summary.totalRevenue > 0 ? (summary.tokenFeeRevenue / summary.totalRevenue) * 100 : 0
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        additionalStats,
        revenue: includeDetails ? revenue : undefined
      }
    });

  } catch (error) {
    console.error('Error in platform revenue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate revenue growth
function calculateRevenueGrowth(dailyRevenue: Record<string, number>): number {
  const days = Object.keys(dailyRevenue).sort();
  if (days.length < 2) return 0;

  const recentDays = days.slice(-7); // Last 7 days
  const previousDays = days.slice(-14, -7); // 7 days before that

  const recentTotal = recentDays.reduce((sum, day) => sum + (dailyRevenue[day] || 0), 0);
  const previousTotal = previousDays.reduce((sum, day) => sum + (dailyRevenue[day] || 0), 0);

  if (previousTotal === 0) return recentTotal > 0 ? 100 : 0;
  return ((recentTotal - previousTotal) / previousTotal) * 100;
}
