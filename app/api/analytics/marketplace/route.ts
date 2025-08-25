import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch comprehensive marketplace analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d'; // 7d, 30d, 90d, 1y, all
    const type = searchParams.get('type') || 'all'; // auctions, offers, revenue, all

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const analytics: any = {};

    // Auction Analytics
    if (type === 'all' || type === 'auctions') {
      analytics.auctions = await getAuctionAnalytics(startDate);
    }

    // Offer Analytics
    if (type === 'all' || type === 'offers') {
      analytics.offers = await getOfferAnalytics(startDate);
    }

    // Revenue Analytics
    if (type === 'all' || type === 'revenue') {
      analytics.revenue = await getRevenueAnalytics(startDate);
    }

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        ...analytics
      }
    });

  } catch (error) {
    console.error('Error fetching marketplace analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Auction Analytics
async function getAuctionAnalytics(startDate: Date) {
  try {
    // Get all auctions in time range
    const { data: auctions, error: auctionError } = await supabase
      .from('marketplace_auctions')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol
        ),
        profiles!marketplace_auctions_seller_user_id_fkey (
          id,
          username
        )
      `)
      .gte('created_at', startDate.toISOString());

    if (auctionError) throw auctionError;

    // Get bid data
    const { data: bids, error: bidError } = await supabase
      .from('auction_bids')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (bidError) throw bidError;

    const totalAuctions = auctions?.length || 0;
    const completedAuctions = auctions?.filter(a => a.status === 'sold' || a.status === 'ended') || [];
    const soldAuctions = auctions?.filter(a => a.status === 'sold') || [];
    const activeAuctions = auctions?.filter(a => a.status === 'active') || [];

    // Calculate metrics
    const successRate = totalAuctions > 0 ? (soldAuctions.length / totalAuctions) * 100 : 0;
    const averageStartingBid = auctions?.reduce((sum, a) => sum + (a.starting_bid || 0), 0) / totalAuctions || 0;
    const averageWinningBid = soldAuctions.reduce((sum, a) => sum + (a.winning_bid || 0), 0) / soldAuctions.length || 0;
    const averageReservePrice = auctions?.filter(a => a.reserve_price).reduce((sum, a) => sum + (a.reserve_price || 0), 0) / auctions.filter(a => a.reserve_price).length || 0;

    // Calculate auction duration stats
    const auctionDurations = completedAuctions.map(auction => {
      const start = new Date(auction.auction_start);
      const end = new Date(auction.ended_at || auction.auction_end);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Hours
    });

    const averageDuration = auctionDurations.length > 0 ? auctionDurations.reduce((sum, d) => sum + d, 0) / auctionDurations.length : 0;

    // Bidder participation
    const uniqueBidders = new Set(bids?.map(b => b.bidder_user_id) || []).size;
    const totalBids = bids?.length || 0;
    const averageBidsPerAuction = totalAuctions > 0 ? totalBids / totalAuctions : 0;

    // Time series data
    const dailyAuctions = getDailyData(auctions || [], 'created_at');
    const dailySales = getDailyData(soldAuctions, 'ended_at');

    return {
      overview: {
        totalAuctions,
        completedAuctions: completedAuctions.length,
        soldAuctions: soldAuctions.length,
        activeAuctions: activeAuctions.length,
        successRate: Math.round(successRate * 100) / 100,
        totalBids,
        uniqueBidders
      },
      financial: {
        averageStartingBid: Math.round(averageStartingBid * 1000) / 1000,
        averageWinningBid: Math.round(averageWinningBid * 1000) / 1000,
        averageReservePrice: Math.round(averageReservePrice * 1000) / 1000,
        totalVolume: soldAuctions.reduce((sum, a) => sum + (a.winning_bid || 0), 0)
      },
      performance: {
        averageDuration: Math.round(averageDuration * 100) / 100, // Hours
        averageBidsPerAuction: Math.round(averageBidsPerAuction * 100) / 100,
        reservePriceMetRate: soldAuctions.filter(a => a.reserve_price && a.winning_bid >= a.reserve_price).length / soldAuctions.length * 100 || 0
      },
      timeSeries: {
        dailyAuctions,
        dailySales
      },
      topTokens: getTopTokens(auctions || []),
      topSellers: getTopSellers(auctions || [])
    };

  } catch (error) {
    console.error('Error in getAuctionAnalytics:', error);
    return null;
  }
}

// Offer Analytics
async function getOfferAnalytics(startDate: Date) {
  try {
    // Get all offers in time range
    const { data: offers, error: offerError } = await supabase
      .from('marketplace_offers')
      .select(`
        *,
        marketplace_listings (
          id,
          listing_price,
          tokens (
            id,
            name,
            symbol
          )
        ),
        profiles!marketplace_offers_buyer_user_id_fkey (
          id,
          username
        )
      `)
      .gte('created_at', startDate.toISOString());

    if (offerError) throw offerError;

    const totalOffers = offers?.length || 0;
    const acceptedOffers = offers?.filter(o => o.status === 'accepted') || [];
    const rejectedOffers = offers?.filter(o => o.status === 'rejected') || [];
    const pendingOffers = offers?.filter(o => o.status === 'pending') || [];
    const counteredOffers = offers?.filter(o => o.status === 'countered') || [];

    // Calculate metrics
    const acceptanceRate = totalOffers > 0 ? (acceptedOffers.length / totalOffers) * 100 : 0;
    const averageOfferAmount = offers?.reduce((sum, o) => sum + (o.offer_amount || 0), 0) / totalOffers || 0;
    const averageAcceptedAmount = acceptedOffers.reduce((sum, o) => sum + (o.offer_amount || 0), 0) / acceptedOffers.length || 0;

    // Time to acceptance
    const timeToAcceptance = acceptedOffers.map(offer => {
      const created = new Date(offer.created_at);
      const accepted = new Date(offer.updated_at);
      return (accepted.getTime() - created.getTime()) / (1000 * 60 * 60); // Hours
    });

    const averageTimeToAcceptance = timeToAcceptance.length > 0 ? timeToAcceptance.reduce((sum, t) => sum + t, 0) / timeToAcceptance.length : 0;

    // Negotiation patterns
    const counterOfferRate = totalOffers > 0 ? (counteredOffers.length / totalOffers) * 100 : 0;
    const averageCounterAmount = counteredOffers.reduce((sum, o) => sum + (o.counter_amount || 0), 0) / counteredOffers.length || 0;

    // Time series data
    const dailyOffers = getDailyData(offers || [], 'created_at');
    const dailyAcceptances = getDailyData(acceptedOffers, 'updated_at');

    return {
      overview: {
        totalOffers,
        acceptedOffers: acceptedOffers.length,
        rejectedOffers: rejectedOffers.length,
        pendingOffers: pendingOffers.length,
        counteredOffers: counteredOffers.length,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        counterOfferRate: Math.round(counterOfferRate * 100) / 100
      },
      financial: {
        averageOfferAmount: Math.round(averageOfferAmount * 1000) / 1000,
        averageAcceptedAmount: Math.round(averageAcceptedAmount * 1000) / 1000,
        averageCounterAmount: Math.round(averageCounterAmount * 1000) / 1000,
        totalVolume: acceptedOffers.reduce((sum, o) => sum + (o.offer_amount || 0), 0)
      },
      performance: {
        averageTimeToAcceptance: Math.round(averageTimeToAcceptance * 100) / 100, // Hours
        medianTimeToAcceptance: timeToAcceptance.length > 0 ? getMedian(timeToAcceptance) : 0
      },
      timeSeries: {
        dailyOffers,
        dailyAcceptances
      },
      topTokens: getTopTokensFromOffers(offers || []),
      topBuyers: getTopBuyers(offers || [])
    };

  } catch (error) {
    console.error('Error in getOfferAnalytics:', error);
    return null;
  }
}

// Revenue Analytics
async function getRevenueAnalytics(startDate: Date) {
  try {
    // Get platform revenue in time range
    const { data: revenue, error: revenueError } = await supabase
      .from('platform_revenue')
      .select('*')
      .gte('collected_at', startDate.toISOString());

    if (revenueError) throw revenueError;

    // Get marketplace sales for additional context
    const { data: sales, error: salesError } = await supabase
      .from('marketplace_sales')
      .select('*')
      .gte('sale_time', startDate.toISOString());

    if (salesError) throw salesError;

    const totalRevenue = revenue?.reduce((sum, r) => sum + (r.amount_sol || 0), 0) || 0;
    const saleFeeRevenue = revenue?.filter(r => r.revenue_type === 'sale_fee').reduce((sum, r) => sum + (r.amount_sol || 0), 0) || 0;
    const tokenFeeRevenue = revenue?.filter(r => r.revenue_type === 'token_fee').reduce((sum, r) => sum + (r.amount_sol || 0), 0) || 0;

    // Calculate efficiency metrics
    const totalSalesVolume = sales?.reduce((sum, s) => sum + (s.sale_price_sol || 0), 0) || 0;
    const feeCollectionEfficiency = totalSalesVolume > 0 ? (totalRevenue / totalSalesVolume) * 100 : 0;

    // Time series data
    const dailyRevenue = getDailyData(revenue || [], 'collected_at');
    const dailySalesVolume = getDailyData(sales || [], 'sale_time');

    // Revenue by type
    const revenueByType = {
      sale_fee: saleFeeRevenue,
      token_fee: tokenFeeRevenue,
      total: totalRevenue
    };

    // Monthly trends
    const monthlyRevenue = getMonthlyData(revenue || [], 'collected_at');

    return {
      overview: {
        totalRevenue: Math.round(totalRevenue * 1000) / 1000,
        saleFeeRevenue: Math.round(saleFeeRevenue * 1000) / 1000,
        tokenFeeRevenue: Math.round(tokenFeeRevenue * 1000) / 1000,
        totalTransactions: revenue?.length || 0,
        averageRevenuePerTransaction: revenue?.length > 0 ? totalRevenue / revenue.length : 0
      },
      efficiency: {
        feeCollectionEfficiency: Math.round(feeCollectionEfficiency * 100) / 100,
        totalSalesVolume: Math.round(totalSalesVolume * 1000) / 1000,
        revenueToVolumeRatio: totalSalesVolume > 0 ? totalRevenue / totalSalesVolume : 0
      },
      trends: {
        dailyRevenue,
        dailySalesVolume,
        monthlyRevenue
      },
      breakdown: {
        revenueByType,
        revenueByMonth: monthlyRevenue
      }
    };

  } catch (error) {
    console.error('Error in getRevenueAnalytics:', error);
    return null;
  }
}

// Helper functions
function getDailyData(data: any[], dateField: string) {
  const dailyMap = new Map();
  
  data.forEach(item => {
    const date = new Date(item[dateField]).toISOString().split('T')[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });

  return Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));
}

function getMonthlyData(data: any[], dateField: string) {
  const monthlyMap = new Map();
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
  });

  return Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count }));
}

function getTopTokens(auctions: any[]) {
  const tokenCount = new Map();
  
  auctions.forEach(auction => {
    const tokenName = auction.tokens?.name || 'Unknown';
    tokenCount.set(tokenName, (tokenCount.get(tokenName) || 0) + 1);
  });

  return Array.from(tokenCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 10);
}

function getTopSellers(auctions: any[]) {
  const sellerCount = new Map();
  
  auctions.forEach(auction => {
    const sellerName = auction.profiles?.username || 'Unknown';
    sellerCount.set(sellerName, (sellerCount.get(sellerName) || 0) + 1);
  });

  return Array.from(sellerCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 10);
}

function getTopTokensFromOffers(offers: any[]) {
  const tokenCount = new Map();
  
  offers.forEach(offer => {
    const tokenName = offer.marketplace_listings?.tokens?.name || 'Unknown';
    tokenCount.set(tokenName, (tokenCount.get(tokenName) || 0) + 1);
  });

  return Array.from(tokenCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 10);
}

function getTopBuyers(offers: any[]) {
  const buyerCount = new Map();
  
  offers.forEach(offer => {
    const buyerName = offer.profiles?.username || 'Unknown';
    buyerCount.set(buyerName, (buyerCount.get(buyerName) || 0) + 1);
  });

  return Array.from(buyerCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 10);
}

function getMedian(numbers: number[]) {
  const sorted = numbers.sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
