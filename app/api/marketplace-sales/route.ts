import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MarketplaceSale, CreateMarketplaceSaleData, MarketplaceSaleFilters, MarketplaceSaleStats } from '@/types/marketplace-sales';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch marketplace sales with filtering and pagination
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Filters
    const tokenId = searchParams.get('token_id');
    const sellerWallet = searchParams.get('seller_wallet');
    const buyerWallet = searchParams.get('buyer_wallet');
    const transactionStatus = searchParams.get('transaction_status');
    const saleType = searchParams.get('sale_type');
    const paymentMethod = searchParams.get('payment_method');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const minPriceSol = searchParams.get('min_price_sol');
    const maxPriceSol = searchParams.get('max_price_sol');
    const isVerifiedSale = searchParams.get('is_verified_sale');
    
    // Check if stats are requested
    const includeStats = searchParams.get('include_stats') === 'true';
    
    // Build query
    let query = supabase
      .from('marketplace_sales')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (tokenId) query = query.eq('token_id', tokenId);
    if (sellerWallet) query = query.eq('seller_wallet', sellerWallet);
    if (buyerWallet) query = query.eq('buyer_wallet', buyerWallet);
    if (transactionStatus) query = query.eq('transaction_status', transactionStatus);
    if (saleType) query = query.eq('sale_type', saleType);
    if (paymentMethod) query = query.eq('payment_method', paymentMethod);
    if (dateFrom) query = query.gte('sale_time', dateFrom);
    if (dateTo) query = query.lte('sale_time', dateTo);
    if (minPriceSol) query = query.gte('sale_price_sol', parseFloat(minPriceSol));
    if (maxPriceSol) query = query.lte('sale_price_sol', parseFloat(maxPriceSol));
    if (isVerifiedSale) query = query.eq('is_verified_sale', isVerifiedSale === 'true');
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Order by sale time (newest first)
    query = query.order('sale_time', { ascending: false });
    
    const { data: sales, error, count } = await query;
    
    if (error) {
      console.error('❌ Error fetching marketplace sales:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch marketplace sales' },
        { status: 500 }
      );
    }
    
    // Calculate stats if requested
    let stats: MarketplaceSaleStats | undefined;
    if (includeStats) {
      stats = await calculateMarketplaceStats();
    }
    
    const totalPages = count ? Math.ceil(count / limit) : 0;
    
    return NextResponse.json({
      success: true,
      data: sales || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages
      }
    });
    
  } catch (error) {
    console.error('❌ Error in marketplace sales API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new marketplace sale
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const saleData: CreateMarketplaceSaleData = await request.json();
    
    // Validate required fields
    if (!saleData.token_id || !saleData.sale_price_sol) {
      return NextResponse.json(
        { success: false, error: 'Token ID and sale price are required' },
        { status: 400 }
      );
    }
    
    // Calculate platform fee (10% of sale price)
    const salePriceLamports = Math.floor(saleData.sale_price_sol * 1000000000); // Convert SOL to lamports
    const platformFeeLamports = Math.floor((salePriceLamports * 10) / 100); // 10% platform fee
    const sellerAmountLamports = salePriceLamports - platformFeeLamports; // 90% to seller
    
    // Add platform fee calculations to sale data
    const saleDataWithFees = {
      ...saleData,
      platform_fee_lamports: platformFeeLamports,
      seller_amount_lamports: sellerAmountLamports
    };
    
    // Get current royalty agreement for this token
    const { data: currentAgreement, error: agreementError } = await supabase
      .from('royalty_agreement_versions')
      .select(`
        id,
        platform_fee_bps,
        royalty_agreement_version_shares (
          earner_wallet,
          bps
        )
      `)
      .eq('token_id', saleData.token_id)
      .is('effective_to', null)
      .single();

    if (agreementError) {
      console.error('Error fetching current royalty agreement:', agreementError);
      // Continue without royalty data
    }

    // Transform current royalty shares to match the expected format
    const currentRoyaltyShares = currentAgreement?.royalty_agreement_version_shares?.map((share: any) => ({
      social_or_wallet: share.earner_wallet,
      royalty_percentage: share.bps / 100 // Convert basis points to percentage
    })) || [];

    // Add current royalty earners to sale data
    const saleDataWithRoyalties = {
      ...saleDataWithFees,
      old_royalty_earners: currentRoyaltyShares,
      new_royalty_earners: currentRoyaltyShares, // Same for now, could change in future
      royalty_earners_changed: false
    };

    // Insert the sale
    const { data: sale, error } = await supabase
      .from('marketplace_sales')
      .insert([saleDataWithRoyalties])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating marketplace sale:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create marketplace sale' },
        { status: 500 }
      );
    }
    
    // Record platform revenue from sale fee
    if (sale && sale.status === 'completed') {
      const { error: revenueError } = await supabase
        .from('platform_revenue')
        .insert({
          revenue_type: 'sale_fee',
          amount_lamports: platformFeeLamports,
          source_sale_id: sale.id,
          source_token_id: sale.token_id,
          status: 'collected'
        });
      
      if (revenueError) {
        console.error('❌ Error recording platform revenue:', revenueError);
        // Don't fail the sale creation, just log the error
      }
    }
    
    return NextResponse.json({
      success: true,
      data: sale
    });
    
  } catch (error) {
    console.error('❌ Error in marketplace sales POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate marketplace statistics
async function calculateMarketplaceStats(): Promise<MarketplaceSaleStats> {
  try {
    // Get confirmed sales only
    const { data: sales, error } = await supabase
      .from('marketplace_sales')
      .select('*')
      .eq('transaction_status', 'confirmed');
    
    if (error) throw error;
    
    if (!sales || sales.length === 0) {
      return {
        total_sales: 0,
        total_volume_sol: 0,
        total_volume_usd: 0,
        total_fees_sol: 0,
        total_fees_usd: 0,
        average_sale_price_sol: 0,
        average_sale_price_usd: 0,
        average_time_to_sell_minutes: 0,
        total_sellers: 0,
        total_buyers: 0,
        verified_sales: 0,
        pending_sales: 0,
        failed_sales: 0
      };
    }
    
    // Calculate totals
    const totalVolumeSol = sales.reduce((sum, sale) => sum + (sale.sale_price_sol || 0), 0);
    const totalVolumeUsd = sales.reduce((sum, sale) => sum + (sale.sale_price_usd || 0), 0);
    const totalFeesSol = sales.reduce((sum, sale) => sum + (sale.fees_sol || 0), 0);
    const totalFeesUsd = sales.reduce((sum, sale) => sum + (sale.fees_usd || 0), 0);
    
    // Calculate averages
    const averageSalePriceSol = totalVolumeSol / sales.length;
    const averageSalePriceUsd = totalVolumeUsd / sales.length;
    
    // Calculate average time to sell (only for sales with time_to_sell_minutes)
    const salesWithTime = sales.filter(sale => sale.time_to_sell_minutes !== null);
    const averageTimeToSell = salesWithTime.length > 0 
      ? salesWithTime.reduce((sum, sale) => sum + (sale.time_to_sell_minutes || 0), 0) / salesWithTime.length
      : 0;
    
    // Count unique sellers and buyers
    const uniqueSellers = new Set(sales.map(sale => sale.seller_wallet).filter(Boolean));
    const uniqueBuyers = new Set(sales.map(sale => sale.buyer_wallet).filter(Boolean));
    
    // Count by status
    const verifiedSales = sales.filter(sale => sale.is_verified_sale).length;
    
    // Get pending and failed sales counts
    const { count: pendingSales } = await supabase
      .from('marketplace_sales')
      .select('*', { count: 'exact', head: true })
      .eq('transaction_status', 'pending');
    
    const { count: failedSales } = await supabase
      .from('marketplace_sales')
      .select('*', { count: 'exact', head: true })
      .eq('transaction_status', 'failed');
    
    return {
      total_sales: sales.length,
      total_volume_sol: totalVolumeSol,
      total_volume_usd: totalVolumeUsd,
      total_fees_sol: totalFeesSol,
      total_fees_usd: totalFeesUsd,
      average_sale_price_sol: averageSalePriceSol,
      average_sale_price_usd: averageSalePriceUsd,
      average_time_to_sell_minutes: averageTimeToSell,
      total_sellers: uniqueSellers.size,
      total_buyers: uniqueBuyers.size,
      verified_sales: verifiedSales,
      pending_sales: pendingSales || 0,
      failed_sales: failedSales || 0
    };
    
  } catch (error) {
    console.error('❌ Error calculating marketplace stats:', error);
    throw error;
  }
}
