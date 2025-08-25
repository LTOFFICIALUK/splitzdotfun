import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

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
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address
        )
      `)
      .eq('transaction_status', 'completed');

    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    if (saleId) {
      query = query.eq('id', saleId);
    }

    // Only collect fees that haven't been collected yet
    if (!forceCollection) {
      query = query.eq('platform_fee_collected', false);
    }

    const { data: sales, error } = await query;

    if (error) {
      console.error('Error fetching sales for fee collection:', error);
      return { amount: 0, count: 0, error: 'Failed to fetch sales' };
    }

    let totalCollected = 0;
    let collectedCount = 0;

    for (const sale of sales || []) {
      try {
        // Calculate platform fee (10% of sale price)
        const platformFee = sale.sale_price_sol * 0.1;
        const platformFeeLamports = Math.floor(platformFee * LAMPORTS_PER_SOL);

        // Record platform revenue
        const { error: revenueError } = await supabase
          .from('platform_revenue')
          .insert({
            revenue_type: 'sale_fee',
            amount_lamports: platformFeeLamports,
            amount_sol: platformFee,
            source_sale_id: sale.id,
            source_token_id: sale.token_id,
            status: 'collected',
            collected_at: new Date().toISOString()
          });

        if (revenueError) {
          console.error('Error recording sale fee revenue:', revenueError);
          continue;
        }

        // Mark sale as fee collected
        await supabase
          .from('marketplace_sales')
          .update({
            platform_fee_collected: true,
            platform_fee_collected_at: new Date().toISOString()
          })
          .eq('id', sale.id);

        totalCollected += platformFee;
        collectedCount++;

      } catch (saleError) {
        console.error('Error processing sale fee collection:', saleError);
      }
    }

    return {
      amount: totalCollected,
      count: collectedCount,
      type: 'sale_fees'
    };

  } catch (error) {
    console.error('Error in collectSaleFees:', error);
    return { amount: 0, count: 0, error: 'Failed to collect sale fees' };
  }
}

// Helper function to collect token fees
async function collectTokenFees(tokenId?: string, forceCollection = false) {
  try {
    let query = supabase
      .from('token_fee_periods')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address
        ),
        marketplace_sales (
          id,
          sale_price_sol,
          completed_at
        )
      `)
      .eq('status', 'active');

    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    const { data: feePeriods, error } = await query;

    if (error) {
      console.error('Error fetching token fee periods:', error);
      return { amount: 0, count: 0, error: 'Failed to fetch token fee periods' };
    }

    let totalCollected = 0;
    let collectedCount = 0;

    for (const period of feePeriods || []) {
      try {
        // Check if period has ended
        const now = new Date();
        const periodEnd = new Date(period.period_end);
        const hasEnded = now > periodEnd;

        if (!hasEnded && !forceCollection) {
          continue; // Skip periods that haven't ended yet
        }

        // Get the latest fee snapshot for this token
        const { data: latestSnapshot, error: snapshotError } = await supabase
          .from('token_fee_snapshots')
          .select('lifetime_fees_lamports')
          .eq('token_id', period.token_id)
          .order('snapshot_time', { ascending: false })
          .limit(1)
          .single();

        if (snapshotError || !latestSnapshot) {
          console.error('Error fetching latest fee snapshot:', snapshotError);
          continue;
        }

        // Calculate new fees generated since last collection
        const lastCollectedFees = period.total_fees_generated_lamports || 0;
        const currentTotalFees = latestSnapshot.lifetime_fees_lamports;
        const newFeesGenerated = currentTotalFees - lastCollectedFees;

        if (newFeesGenerated <= 0 && !forceCollection) {
          continue; // No new fees to collect
        }

        // Calculate platform's 10% share
        const platformFeeLamports = Math.floor(newFeesGenerated * 0.1);
        const platformFeeSol = platformFeeLamports / LAMPORTS_PER_SOL;

        if (platformFeeLamports > 0) {
          // Record platform revenue
          const { error: revenueError } = await supabase
            .from('platform_revenue')
            .insert({
              revenue_type: 'token_fee',
              amount_lamports: platformFeeLamports,
              amount_sol: platformFeeSol,
              source_token_id: period.token_id,
              source_fee_period_id: period.id,
              status: 'collected',
              collected_at: new Date().toISOString()
            });

          if (revenueError) {
            console.error('Error recording token fee revenue:', revenueError);
            continue;
          }

          // Update fee period
          await supabase
            .from('token_fee_periods')
            .update({
              total_fees_generated_lamports: currentTotalFees,
              platform_fee_collected_lamports: (period.platform_fee_collected_lamports || 0) + platformFeeLamports,
              platform_fee_collected_sol: (period.platform_fee_collected_sol || 0) + platformFeeSol,
              last_collection_at: new Date().toISOString(),
              status: hasEnded ? 'completed' : 'active'
            })
            .eq('id', period.id);

          totalCollected += platformFeeSol;
          collectedCount++;
        }

      } catch (periodError) {
        console.error('Error processing token fee period:', periodError);
      }
    }

    return {
      amount: totalCollected,
      count: collectedCount,
      type: 'token_fees'
    };

  } catch (error) {
    console.error('Error in collectTokenFees:', error);
    return { amount: 0, count: 0, error: 'Failed to collect token fees' };
  }
}

// GET - Get collection status and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    // Get pending sale fees
    const { data: pendingSaleFees, error: saleFeesError } = await supabase
      .from('marketplace_sales')
      .select('sale_price_sol')
      .eq('transaction_status', 'completed')
      .eq('platform_fee_collected', false);

    // Get active token fee periods
    const { data: activeTokenPeriods, error: tokenPeriodsError } = await supabase
      .from('token_fee_periods')
      .select('total_fees_generated_lamports, platform_fee_collected_lamports')
      .eq('status', 'active');

    if (saleFeesError || tokenPeriodsError) {
      console.error('Error fetching collection statistics:', { saleFeesError, tokenPeriodsError });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch collection statistics' },
        { status: 500 }
      );
    }

    // Calculate pending amounts
    const pendingSaleFeesAmount = (pendingSaleFees || []).reduce((sum, sale) => {
      return sum + (sale.sale_price_sol * 0.1); // 10% platform fee
    }, 0);

    const pendingTokenFeesAmount = (activeTokenPeriods || []).reduce((sum, period) => {
      const totalFees = period.total_fees_generated_lamports || 0;
      const collectedFees = period.platform_fee_collected_lamports || 0;
      const uncollectedFees = totalFees - collectedFees;
      return sum + (uncollectedFees * 0.1 / LAMPORTS_PER_SOL); // 10% of uncollected fees
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        pendingSaleFees: {
          amount: pendingSaleFeesAmount,
          count: pendingSaleFees?.length || 0
        },
        pendingTokenFees: {
          amount: pendingTokenFeesAmount,
          count: activeTokenPeriods?.length || 0
        },
        totalPending: pendingSaleFeesAmount + pendingTokenFeesAmount
      }
    });

  } catch (error) {
    console.error('Error getting collection status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
