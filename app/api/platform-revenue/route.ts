import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get platform revenue summary and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const revenueType = searchParams.get('type'); // 'sale_fee' or 'token_fee'

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
      tokenFeeCount: 0
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
    });

    return NextResponse.json({
      success: true,
      data: {
        revenue,
        summary
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

// POST - Record platform revenue (used internally by other systems)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      revenueType,
      amountLamports,
      sourceSaleId,
      sourceTokenId,
      feePeriodId,
      transactionSignature
    } = body;

    // Validate required fields
    if (!revenueType || !amountLamports) {
      return NextResponse.json(
        { success: false, error: 'Revenue type and amount are required' },
        { status: 400 }
      );
    }

    if (!['sale_fee', 'token_fee'].includes(revenueType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid revenue type' },
        { status: 400 }
      );
    }

    if (amountLamports <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Create revenue record
    const { data: revenue, error } = await supabase
      .from('platform_revenue')
      .insert({
        revenue_type: revenueType,
        amount_lamports: amountLamports,
        source_sale_id: sourceSaleId || null,
        source_token_id: sourceTokenId || null,
        fee_period_id: feePeriodId || null,
        transaction_signature: transactionSignature || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating platform revenue:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to record platform revenue' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: revenue
    });

  } catch (error) {
    console.error('Error creating platform revenue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
