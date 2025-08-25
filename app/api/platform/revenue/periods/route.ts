import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get token fee periods with filtering and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const saleId = searchParams.get('saleId');
    const status = searchParams.get('status') || 'all';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';

    let query = supabase
      .from('token_fee_periods')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          image_url
        ),
        marketplace_sales (
          id,
          sale_price_sol,
          completed_at,
          buyer_user_id,
          seller_user_id,
          profiles!marketplace_sales_buyer_user_id_fkey (
            username,
            wallet_address
          ),
          profiles!marketplace_sales_seller_user_id_fkey (
            username,
            wallet_address
          )
        )
      `);

    // Apply filters
    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    if (saleId) {
      query = query.eq('sale_id', saleId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (activeOnly) {
      query = query.eq('status', 'active');
    }

    const { data: feePeriods, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching token fee periods:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch token fee periods' },
        { status: 500 }
      );
    }

    // Calculate analytics if requested
    let analytics = null;
    if (includeAnalytics && feePeriods) {
      analytics = {
        totalPeriods: feePeriods.length,
        activePeriods: feePeriods.filter(p => p.status === 'active').length,
        completedPeriods: feePeriods.filter(p => p.status === 'completed').length,
        totalFeesGenerated: feePeriods.reduce((sum, p) => sum + p.total_fees_generated_sol, 0),
        totalPlatformFeesCollected: feePeriods.reduce((sum, p) => sum + p.platform_fee_collected_sol, 0),
        averageFeesPerPeriod: feePeriods.length > 0 ? 
          feePeriods.reduce((sum, p) => sum + p.total_fees_generated_sol, 0) / feePeriods.length : 0,
        averagePlatformFeesPerPeriod: feePeriods.length > 0 ? 
          feePeriods.reduce((sum, p) => sum + p.platform_fee_collected_sol, 0) / feePeriods.length : 0,
        periodsByStatus: {
          active: feePeriods.filter(p => p.status === 'active').length,
          completed: feePeriods.filter(p => p.status === 'completed').length,
          cancelled: feePeriods.filter(p => p.status === 'cancelled').length
        },
        topPerformingTokens: feePeriods
          .reduce((acc, period) => {
            const tokenSymbol = period.tokens?.symbol || 'Unknown';
            if (!acc[tokenSymbol]) {
              acc[tokenSymbol] = {
                totalFees: 0,
                totalPlatformFees: 0,
                periods: 0
              };
            }
            acc[tokenSymbol].totalFees += period.total_fees_generated_sol;
            acc[tokenSymbol].totalPlatformFees += period.platform_fee_collected_sol;
            acc[tokenSymbol].periods += 1;
            return acc;
          }, {} as Record<string, { totalFees: number; totalPlatformFees: number; periods: number }>)
      };

      // Sort top performing tokens
      analytics.topPerformingTokens = Object.entries(analytics.topPerformingTokens)
        .sort(([,a], [,b]) => (b as { totalPlatformFees: number }).totalPlatformFees - (a as { totalPlatformFees: number }).totalPlatformFees)
        .slice(0, 10)
        .reduce((acc, [symbol, data]) => {
          acc[symbol] = data as { totalFees: number; totalPlatformFees: number; periods: number };
          return acc;
        }, {} as Record<string, { totalFees: number; totalPlatformFees: number; periods: number }>);
    }

    return NextResponse.json({
      success: true,
      data: {
        feePeriods,
        analytics
      }
    });

  } catch (error) {
    console.error('Error in token fee periods:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new token fee period (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tokenId,
      saleId,
      periodStart,
      periodEnd,
      feePercentage = 10.00
    } = body;

    // Validate required fields
    if (!tokenId || !saleId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, error: 'Token ID, sale ID, period start, and period end are required' },
        { status: 400 }
      );
    }

    // Validate fee percentage
    if (feePercentage < 0 || feePercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Fee percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Check if there's already an active period for this token
    const { data: existingPeriod, error: checkError } = await supabase
      .from('token_fee_periods')
      .select('id')
      .eq('token_id', tokenId)
      .eq('status', 'active')
      .single();

    if (existingPeriod) {
      return NextResponse.json(
        { success: false, error: 'Token already has an active fee period' },
        { status: 400 }
      );
    }

    // Create fee period
    const { data: feePeriod, error } = await supabase
      .from('token_fee_periods')
      .insert({
        token_id: tokenId,
        sale_id: saleId,
        period_start: periodStart,
        period_end: periodEnd,
        fee_percentage: feePercentage,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating token fee period:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create token fee period' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feePeriod
    });

  } catch (error) {
    console.error('Error creating token fee period:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
