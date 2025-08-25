import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get comprehensive revenue analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'day'; // 'day', 'week', 'month'
    const includeProjections = searchParams.get('includeProjections') === 'true';

    // Get revenue data
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

    const { data: revenue, error } = await query.order('collected_at', { ascending: true });

    if (error) {
      console.error('Error fetching revenue data:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch revenue data' },
        { status: 500 }
      );
    }

    // Calculate analytics
    const analytics = calculateRevenueAnalytics(revenue || [], groupBy, includeProjections);

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error in revenue analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate comprehensive analytics
function calculateRevenueAnalytics(revenue: any[], groupBy: string, includeProjections: boolean) {
  const analytics = {
    summary: {
      totalRevenue: 0,
      saleFeeRevenue: 0,
      tokenFeeRevenue: 0,
      transactionCount: revenue.length,
      saleFeeCount: 0,
      tokenFeeCount: 0,
      averageRevenuePerTransaction: 0,
      revenueGrowth: 0,
      projectedRevenue: 0
    },
    timeSeries: {} as Record<string, any>,
    topTokens: [] as any[],
    revenueByType: {
      sale_fee: { total: 0, count: 0, percentage: 0 },
      token_fee: { total: 0, count: 0, percentage: 0 }
    },
    performanceMetrics: {
      dailyAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0,
      bestDay: null as any,
      worstDay: null as any
    }
  };

  // Group revenue by time period
  const timeSeriesData: Record<string, { total: number; count: number; saleFees: number; tokenFees: number }> = {};
  const tokenPerformance: Record<string, { total: number; count: number; type: string }> = {};

  revenue.forEach(item => {
    const amount = item.amount_sol;
    analytics.summary.totalRevenue += amount;

    // Group by revenue type
    if (item.revenue_type === 'sale_fee') {
      analytics.summary.saleFeeRevenue += amount;
      analytics.summary.saleFeeCount++;
      analytics.revenueByType.sale_fee.total += amount;
      analytics.revenueByType.sale_fee.count++;
    } else if (item.revenue_type === 'token_fee') {
      analytics.summary.tokenFeeRevenue += amount;
      analytics.summary.tokenFeeCount++;
      analytics.revenueByType.token_fee.total += amount;
      analytics.revenueByType.token_fee.count++;
    }

    // Group by time period
    const date = new Date(item.collected_at);
    let timeKey = '';
    
    switch (groupBy) {
      case 'day':
        timeKey = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        timeKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        timeKey = date.toISOString().slice(0, 7); // YYYY-MM
        break;
      default:
        timeKey = date.toISOString().split('T')[0];
    }

    if (!timeSeriesData[timeKey]) {
      timeSeriesData[timeKey] = { total: 0, count: 0, saleFees: 0, tokenFees: 0 };
    }
    timeSeriesData[timeKey].total += amount;
    timeSeriesData[timeKey].count += 1;

    if (item.revenue_type === 'sale_fee') {
      timeSeriesData[timeKey].saleFees += amount;
    } else if (item.revenue_type === 'token_fee') {
      timeSeriesData[timeKey].tokenFees += amount;
    }

    // Track token performance
    const tokenSymbol = item.marketplace_sales?.tokens?.symbol || 
                       item.token_fee_periods?.tokens?.symbol || 
                       'Unknown';
    
    if (!tokenPerformance[tokenSymbol]) {
      tokenPerformance[tokenSymbol] = { total: 0, count: 0, type: item.revenue_type };
    }
    tokenPerformance[tokenSymbol].total += amount;
    tokenPerformance[tokenSymbol].count += 1;
  });

  // Calculate percentages
  if (analytics.summary.totalRevenue > 0) {
    analytics.revenueByType.sale_fee.percentage = (analytics.revenueByType.sale_fee.total / analytics.summary.totalRevenue) * 100;
    analytics.revenueByType.token_fee.percentage = (analytics.revenueByType.token_fee.total / analytics.summary.totalRevenue) * 100;
  }

  // Calculate averages
  analytics.summary.averageRevenuePerTransaction = analytics.summary.transactionCount > 0 ? 
    analytics.summary.totalRevenue / analytics.summary.transactionCount : 0;

  // Calculate revenue growth
  const timeKeys = Object.keys(timeSeriesData).sort();
  if (timeKeys.length >= 2) {
    const recentPeriods = timeKeys.slice(-7);
    const previousPeriods = timeKeys.slice(-14, -7);
    
    const recentTotal = recentPeriods.reduce((sum, key) => sum + timeSeriesData[key].total, 0);
    const previousTotal = previousPeriods.reduce((sum, key) => sum + timeSeriesData[key].total, 0);
    
    if (previousTotal > 0) {
      analytics.summary.revenueGrowth = ((recentTotal - previousTotal) / previousTotal) * 100;
    }
  }

  // Calculate performance metrics
  const dailyTotals = Object.values(timeSeriesData).map(d => d.total);
  if (dailyTotals.length > 0) {
    analytics.performanceMetrics.dailyAverage = dailyTotals.reduce((sum, total) => sum + total, 0) / dailyTotals.length;
    analytics.performanceMetrics.bestDay = Math.max(...dailyTotals);
    analytics.performanceMetrics.worstDay = Math.min(...dailyTotals);
  }

  // Calculate weekly and monthly averages
  const weeklyTotals = Object.values(timeSeriesData).map(d => d.total);
  if (weeklyTotals.length > 0) {
    analytics.performanceMetrics.weeklyAverage = weeklyTotals.reduce((sum, total) => sum + total, 0) / weeklyTotals.length;
  }

  // Sort top tokens
  analytics.topTokens = Object.entries(tokenPerformance)
    .map(([symbol, data]) => ({
      symbol,
      total: data.total,
      count: data.count,
      type: data.type,
      average: data.count > 0 ? data.total / data.count : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Format time series data
  analytics.timeSeries = Object.entries(timeSeriesData)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, data]) => {
      acc[key] = {
        total: data.total,
        count: data.count,
        saleFees: data.saleFees,
        tokenFees: data.tokenFees,
        average: data.count > 0 ? data.total / data.count : 0
      };
      return acc;
    }, {} as Record<string, any>);

  // Calculate projections if requested
  if (includeProjections) {
    analytics.summary.projectedRevenue = calculateProjectedRevenue(analytics.timeSeries, analytics.summary.revenueGrowth);
  }

  return analytics;
}

// Helper function to calculate projected revenue
function calculateProjectedRevenue(timeSeries: Record<string, any>, growthRate: number): number {
  const timeKeys = Object.keys(timeSeries).sort();
  if (timeKeys.length === 0) return 0;

  // Get the most recent period's revenue
  const latestPeriod = timeSeries[timeKeys[timeKeys.length - 1]];
  const latestRevenue = latestPeriod.total;

  // Project for the next 30 days
  const daysToProject = 30;
  let projectedRevenue = 0;

  for (let i = 1; i <= daysToProject; i++) {
    const dailyGrowth = 1 + (growthRate / 100 / 365); // Convert annual growth to daily
    projectedRevenue += latestRevenue * Math.pow(dailyGrowth, i);
  }

  return projectedRevenue;
}
