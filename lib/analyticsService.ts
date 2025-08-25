import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AnalyticsCacheOptions {
  ttl?: number; // Time to live in seconds, default 300 (5 minutes)
  forceRefresh?: boolean;
}

export class AnalyticsService {
  // Cache management
  static async getCachedData<T>(key: string, options: AnalyticsCacheOptions = {}): Promise<T | null> {
    const { ttl = 300, forceRefresh = false } = options;

    if (forceRefresh) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('analytics_cache')
        .select('cache_data, expires_at')
        .eq('cache_key', key)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if cache is expired
      if (new Date(data.expires_at) < new Date()) {
        // Delete expired cache
        await this.deleteCachedData(key);
        return null;
      }

      return data.cache_data as T;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  static async setCachedData<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);

      const { error } = await supabase
        .from('analytics_cache')
        .upsert({
          cache_key: key,
          cache_data: data,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error setting cached data:', error);
      }
    } catch (error) {
      console.error('Error in setCachedData:', error);
    }
  }

  static async deleteCachedData(key: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics_cache')
        .delete()
        .eq('cache_key', key);

      if (error) {
        console.error('Error deleting cached data:', error);
      }
    } catch (error) {
      console.error('Error in deleteCachedData:', error);
    }
  }

  static async clearExpiredCache(): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error clearing expired cache:', error);
      }
    } catch (error) {
      console.error('Error in clearExpiredCache:', error);
    }
  }

  // Analytics data collection
  static async recordPlatformRevenue(data: {
    revenueType: string;
    amountSol: number;
    transactionHash?: string;
    saleId?: string;
    auctionId?: string;
    listingId?: string;
    tokenId?: string;
    userId?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('platform_revenue')
        .insert({
          revenue_type: data.revenueType,
          amount_sol: data.amountSol,
          transaction_hash: data.transactionHash,
          sale_id: data.saleId,
          auction_id: data.auctionId,
          listing_id: data.listingId,
          token_id: data.tokenId,
          user_id: data.userId
        });

      if (error) {
        console.error('Error recording platform revenue:', error);
      }
    } catch (error) {
      console.error('Error in recordPlatformRevenue:', error);
    }
  }

  static async recordAuctionBid(data: {
    auctionId: string;
    bidderUserId: string;
    bidAmount: number;
    isWinningBid?: boolean;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('auction_bids')
        .insert({
          auction_id: data.auctionId,
          bidder_user_id: data.bidderUserId,
          bid_amount: data.bidAmount,
          is_winning_bid: data.isWinningBid || false
        });

      if (error) {
        console.error('Error recording auction bid:', error);
      }
    } catch (error) {
      console.error('Error in recordAuctionBid:', error);
    }
  }

  // Analytics queries using views
  static async getAuctionAnalytics(timeRange: string = '30d'): Promise<any> {
    const cacheKey = `auction_analytics_${timeRange}`;
    
    // Try to get from cache first
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = this.getStartDate(timeRange);

      const { data, error } = await supabase
        .from('auction_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching auction analytics:', error);
        return null;
      }

      const analytics = this.processAuctionAnalytics(data || []);
      
      // Cache the result
      await this.setCachedData(cacheKey, analytics, 300);
      
      return analytics;
    } catch (error) {
      console.error('Error in getAuctionAnalytics:', error);
      return null;
    }
  }

  static async getOfferAnalytics(timeRange: string = '30d'): Promise<any> {
    const cacheKey = `offer_analytics_${timeRange}`;
    
    // Try to get from cache first
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = this.getStartDate(timeRange);

      const { data, error } = await supabase
        .from('offer_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching offer analytics:', error);
        return null;
      }

      const analytics = this.processOfferAnalytics(data || []);
      
      // Cache the result
      await this.setCachedData(cacheKey, analytics, 300);
      
      return analytics;
    } catch (error) {
      console.error('Error in getOfferAnalytics:', error);
      return null;
    }
  }

  static async getRevenueAnalytics(timeRange: string = '30d'): Promise<any> {
    const cacheKey = `revenue_analytics_${timeRange}`;
    
    // Try to get from cache first
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = this.getStartDate(timeRange);

      const { data, error } = await supabase
        .from('revenue_analytics')
        .select('*')
        .gte('collected_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching revenue analytics:', error);
        return null;
      }

      const analytics = this.processRevenueAnalytics(data || []);
      
      // Cache the result
      await this.setCachedData(cacheKey, analytics, 300);
      
      return analytics;
    } catch (error) {
      console.error('Error in getRevenueAnalytics:', error);
      return null;
    }
  }

  // Helper methods
  private static getStartDate(timeRange: string): Date {
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // All time
    }
  }

  private static processAuctionAnalytics(data: any[]): any {
    const totalAuctions = data.length;
    const soldAuctions = data.filter(a => a.status === 'sold');
    const activeAuctions = data.filter(a => a.status === 'active');
    
    const successRate = totalAuctions > 0 ? (soldAuctions.length / totalAuctions) * 100 : 0;
    const averageStartingBid = data.reduce((sum, a) => sum + (a.starting_bid || 0), 0) / totalAuctions || 0;
    const averageWinningBid = soldAuctions.reduce((sum, a) => sum + (a.winning_bid || 0), 0) / soldAuctions.length || 0;
    const totalVolume = soldAuctions.reduce((sum, a) => sum + (a.winning_bid || 0), 0);
    
    const uniqueBidders = new Set(data.flatMap(a => a.unique_bidders || 0)).size;
    const totalBids = data.reduce((sum, a) => sum + (a.total_bids || 0), 0);
    const averageBidsPerAuction = totalAuctions > 0 ? totalBids / totalAuctions : 0;

    return {
      overview: {
        totalAuctions,
        soldAuctions: soldAuctions.length,
        activeAuctions: activeAuctions.length,
        successRate: Math.round(successRate * 100) / 100,
        totalBids,
        uniqueBidders
      },
      financial: {
        averageStartingBid: Math.round(averageStartingBid * 1000) / 1000,
        averageWinningBid: Math.round(averageWinningBid * 1000) / 1000,
        totalVolume: Math.round(totalVolume * 1000) / 1000
      },
      performance: {
        averageBidsPerAuction: Math.round(averageBidsPerAuction * 100) / 100
      }
    };
  }

  private static processOfferAnalytics(data: any[]): any {
    const totalOffers = data.length;
    const acceptedOffers = data.filter(o => o.status === 'accepted');
    const rejectedOffers = data.filter(o => o.status === 'rejected');
    const pendingOffers = data.filter(o => o.status === 'pending');
    
    const acceptanceRate = totalOffers > 0 ? (acceptedOffers.length / totalOffers) * 100 : 0;
    const averageOfferAmount = data.reduce((sum, o) => sum + (o.offer_amount || 0), 0) / totalOffers || 0;
    const averageAcceptedAmount = acceptedOffers.reduce((sum, o) => sum + (o.offer_amount || 0), 0) / acceptedOffers.length || 0;
    const totalVolume = acceptedOffers.reduce((sum, o) => sum + (o.offer_amount || 0), 0);

    return {
      overview: {
        totalOffers,
        acceptedOffers: acceptedOffers.length,
        rejectedOffers: rejectedOffers.length,
        pendingOffers: pendingOffers.length,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100
      },
      financial: {
        averageOfferAmount: Math.round(averageOfferAmount * 1000) / 1000,
        averageAcceptedAmount: Math.round(averageAcceptedAmount * 1000) / 1000,
        totalVolume: Math.round(totalVolume * 1000) / 1000
      }
    };
  }

  private static processRevenueAnalytics(data: any[]): any {
    const totalRevenue = data.reduce((sum, r) => sum + (r.amount_sol || 0), 0);
    const saleFeeRevenue = data.filter(r => r.revenue_type === 'sale_fee').reduce((sum, r) => sum + (r.amount_sol || 0), 0);
    const tokenFeeRevenue = data.filter(r => r.revenue_type === 'token_fee').reduce((sum, r) => sum + (r.amount_sol || 0), 0);
    
    return {
      overview: {
        totalRevenue: Math.round(totalRevenue * 1000) / 1000,
        saleFeeRevenue: Math.round(saleFeeRevenue * 1000) / 1000,
        tokenFeeRevenue: Math.round(tokenFeeRevenue * 1000) / 1000,
        totalTransactions: data.length
      },
      breakdown: {
        revenueByType: {
          sale_fee: saleFeeRevenue,
          token_fee: tokenFeeRevenue,
          total: totalRevenue
        }
      }
    };
  }
}
