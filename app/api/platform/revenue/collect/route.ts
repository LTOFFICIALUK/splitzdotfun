import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Collect platform fees manually (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      collectionType, // 'sale_fees', 'token_fees', 'all'
      tokenId,
      saleId,
      forceCollection = false
    } = body;

    if (!collectionType || !['sale_fees', 'token_fees', 'all'].includes(collectionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection type' },
        { status: 400 }
      );
    }

    let collectedAmount = 0;
    let collectionResults = [];

    if (collectionType === 'sale_fees' || collectionType === 'all') {
      // Collect sale fees
      const saleFeesResult = await collectSaleFees(tokenId, saleId, forceCollection);
      collectedAmount += saleFeesResult.amount;
      collectionResults.push(saleFeesResult);
    }

    if (collectionType === 'token_fees' || collectionType === 'all') {
      // Collect token fees
      const tokenFeesResult = await collectTokenFees(tokenId, forceCollection);
      collectedAmount += tokenFeesResult.amount;
      collectionResults.push(tokenFeesResult);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCollected: collectedAmount,
        results: collectionResults
      }
    });

  } catch (error) {
    console.error('Error collecting platform fees:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to collect sale fees
async function collectSaleFees(tokenId?: string, saleId?: string, forceCollection = false) {
  try {
    let query = supabase
      .from('marketplace_sales')
      .select(`
        id,
        token_id,
        sale_price_sol,
        platform_fee_lamports,
        status,
        completed_at
      `)
      .eq('status', 'completed');

    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    if (saleId) {
      query = query.eq('id', saleId);
    }

    const { data: sales, error } = await query;

    if (error) {
      throw error;
    }

    let totalCollected = 0;
    const collectedSales = [];

    for (const sale of sales || []) {
      // Check if platform revenue already recorded for this sale
      if (!forceCollection) {
        const { data: existingRevenue } = await supabase
          .from('platform_revenue')
          .select('id')
          .eq('source_sale_id', sale.id)
          .eq('revenue_type', 'sale_fee')
          .single();

        if (existingRevenue) {
          continue; // Already collected
        }
      }

      // Record platform revenue
      const { error: revenueError } = await supabase
        .from('platform_revenue')
        .insert({
          revenue_type: 'sale_fee',
          amount_lamports: sale.platform_fee_lamports,
          source_sale_id: sale.id,
          source_token_id: sale.token_id,
          status: 'collected'
        });

      if (!revenueError) {
        totalCollected += sale.platform_fee_lamports / 1000000000; // Convert to SOL
        collectedSales.push({
          saleId: sale.id,
          amount: sale.platform_fee_lamports / 1000000000
        });
      }
    }

    return {
      type: 'sale_fees',
      amount: totalCollected,
      salesCollected: collectedSales.length,
      details: collectedSales
    };

  } catch (error) {
    console.error('Error collecting sale fees:', error);
    return {
      type: 'sale_fees',
      amount: 0,
      salesCollected: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to collect token fees
async function collectTokenFees(tokenId?: string, forceCollection = false) {
  try {
    let query = supabase
      .from('token_fee_periods')
      .select(`
        id,
        token_id,
        total_fees_generated_lamports,
        platform_fee_collected_lamports,
        status,
        period_start,
        period_end
      `)
      .eq('status', 'active');

    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    const { data: periods, error } = await query;

    if (error) {
      throw error;
    }

    let totalCollected = 0;
    const collectedPeriods = [];

    for (const period of periods || []) {
      // Get latest fee snapshot for this token
      const { data: latestSnapshot } = await supabase
        .from('token_fee_snapshots')
        .select('lifetime_fees_lamports_after')
        .eq('token_id', period.token_id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (!latestSnapshot) {
        continue;
      }

      // Calculate new fees generated
      const newFeesGenerated = latestSnapshot.lifetime_fees_lamports_after - period.total_fees_generated_lamports;
      
      if (newFeesGenerated <= 0) {
        continue;
      }

      // Calculate platform's share (10%)
      const platformFeeLamports = Math.floor((newFeesGenerated * 10) / 100);

      if (platformFeeLamports <= 0) {
        continue;
      }

      // Update fee period
      const { error: updateError } = await supabase
        .from('token_fee_periods')
        .update({
          total_fees_generated_lamports: period.total_fees_generated_lamports + newFeesGenerated,
          platform_fee_collected_lamports: period.platform_fee_collected_lamports + platformFeeLamports,
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id);

      if (updateError) {
        continue;
      }

      // Record platform revenue
      const { error: revenueError } = await supabase
        .from('platform_revenue')
        .insert({
          revenue_type: 'token_fee',
          amount_lamports: platformFeeLamports,
          source_token_id: period.token_id,
          fee_period_id: period.id,
          status: 'collected'
        });

      if (!revenueError) {
        totalCollected += platformFeeLamports / 1000000000; // Convert to SOL
        collectedPeriods.push({
          periodId: period.id,
          amount: platformFeeLamports / 1000000000,
          newFeesGenerated: newFeesGenerated / 1000000000
        });
      }

      // Check if period has ended
      if (new Date() >= new Date(period.period_end)) {
        await supabase
          .from('token_fee_periods')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', period.id);
      }
    }

    return {
      type: 'token_fees',
      amount: totalCollected,
      periodsCollected: collectedPeriods.length,
      details: collectedPeriods
    };

  } catch (error) {
    console.error('Error collecting token fees:', error);
    return {
      type: 'token_fees',
      amount: 0,
      periodsCollected: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
