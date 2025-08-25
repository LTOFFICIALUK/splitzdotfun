import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  // Create a notification
  static async createNotification(notification: NotificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || null,
          read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in createNotification:', error);
      return { success: false, error };
    }
  }

  // Create multiple notifications
  static async createMultipleNotifications(notifications: NotificationData[]) {
    try {
      const notificationData = notifications.map(notification => ({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || null,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select();

      if (error) {
        console.error('Error creating multiple notifications:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in createMultipleNotifications:', error);
      return { success: false, error };
    }
  }

  // Auction-specific notification methods
  static async notifyNewBid(auctionId: string, tokenName: string, bidAmount: number, bidderUsername: string, sellerUserId: string) {
    return this.createNotification({
      userId: sellerUserId,
      type: 'new_bid',
      title: 'New Bid Received',
      message: `${bidderUsername} placed a bid of ${bidAmount} SOL on your ${tokenName} auction`,
      data: {
        auction_id: auctionId,
        token_name: tokenName,
        bid_amount: bidAmount,
        bidder_username: bidderUsername
      }
    });
  }

  static async notifyOutbid(auctionId: string, tokenName: string, bidAmount: number, outbidUserId: string) {
    return this.createNotification({
      userId: outbidUserId,
      type: 'outbid',
      title: 'You\'ve Been Outbid',
      message: `Someone outbid you on ${tokenName} with ${bidAmount} SOL`,
      data: {
        auction_id: auctionId,
        token_name: tokenName,
        bid_amount: bidAmount
      }
    });
  }

  static async notifyAuctionWon(auctionId: string, tokenName: string, winningBid: number, winnerUserId: string) {
    return this.createNotification({
      userId: winnerUserId,
      type: 'auction_won',
      title: 'Auction Won!',
      message: `Congratulations! You won the ${tokenName} auction for ${winningBid} SOL`,
      data: {
        auction_id: auctionId,
        token_name: tokenName,
        winning_bid: winningBid
      }
    });
  }

  static async notifyAuctionEnded(auctionId: string, tokenName: string, winningBid: number, winnerUsername: string, sellerUserId: string) {
    return this.createNotification({
      userId: sellerUserId,
      type: 'auction_ended',
      title: 'Auction Ended',
      message: `Your ${tokenName} auction ended. ${winnerUsername} won with ${winningBid} SOL`,
      data: {
        auction_id: auctionId,
        token_name: tokenName,
        winning_bid: winningBid,
        winner_username: winnerUsername
      }
    });
  }

  // Offer-specific notification methods
  static async notifyNewOffer(listingId: string, tokenName: string, offerAmount: number, buyerUsername: string, sellerUserId: string) {
    return this.createNotification({
      userId: sellerUserId,
      type: 'new_offer',
      title: 'New Offer Received',
      message: `${buyerUsername} made an offer of ${offerAmount} SOL on ${tokenName}`,
      data: {
        listing_id: listingId,
        token_name: tokenName,
        offer_amount: offerAmount,
        buyer_username: buyerUsername
      }
    });
  }

  static async notifyOfferAccepted(offerId: string, tokenName: string, offerAmount: number, buyerUserId: string) {
    return this.createNotification({
      userId: buyerUserId,
      type: 'offer_accepted',
      title: 'Offer Accepted!',
      message: `Your offer of ${offerAmount} SOL on ${tokenName} was accepted`,
      data: {
        offer_id: offerId,
        token_name: tokenName,
        offer_amount: offerAmount
      }
    });
  }

  static async notifyOfferRejected(offerId: string, tokenName: string, offerAmount: number, buyerUserId: string) {
    return this.createNotification({
      userId: buyerUserId,
      type: 'offer_rejected',
      title: 'Offer Rejected',
      message: `Your offer of ${offerAmount} SOL on ${tokenName} was rejected`,
      data: {
        offer_id: offerId,
        token_name: tokenName,
        offer_amount: offerAmount
      }
    });
  }

  static async notifyCounterOffer(offerId: string, tokenName: string, counterAmount: number, buyerUserId: string) {
    return this.createNotification({
      userId: buyerUserId,
      type: 'offer_counter',
      title: 'Counter Offer Received',
      message: `Seller countered your offer on ${tokenName} with ${counterAmount} SOL`,
      data: {
        offer_id: offerId,
        token_name: tokenName,
        counter_amount: counterAmount
      }
    });
  }

  // Revenue-specific notification methods
  static async notifyPlatformFeeCollected(saleId: string, tokenName: string, feeAmount: number, adminUserId: string) {
    return this.createNotification({
      userId: adminUserId,
      type: 'platform_fee_collected',
      title: 'Platform Fee Collected',
      message: `Platform fee of ${feeAmount} SOL collected from ${tokenName} sale`,
      data: {
        sale_id: saleId,
        token_name: tokenName,
        fee_amount: feeAmount
      }
    });
  }

  static async notifyTokenFeePeriodStarted(tokenId: string, tokenName: string, sellerUserId: string) {
    return this.createNotification({
      userId: sellerUserId,
      type: 'token_fee_period_started',
      title: 'Fee Period Started',
      message: `7-day fee collection period started for ${tokenName}`,
      data: {
        token_id: tokenId,
        token_name: tokenName
      }
    });
  }

  static async notifyTokenFeePeriodCompleted(tokenId: string, tokenName: string, totalCollected: number, sellerUserId: string) {
    return this.createNotification({
      userId: sellerUserId,
      type: 'token_fee_period_completed',
      title: 'Fee Period Completed',
      message: `Fee collection period completed for ${tokenName}. Total collected: ${totalCollected} SOL`,
      data: {
        token_id: tokenId,
        token_name: tokenName,
        total_collected: totalCollected
      }
    });
  }

  // Utility methods
  static async markAsRead(notificationId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return { success: false, error };
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)
        .select();

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return { success: false, error };
    }
  }

  static async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return { success: false, error };
    }
  }

  static async clearAllNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (error) {
        console.error('Error clearing all notifications:', error);
        return { success: false, error };
      }

      const deletedCount = data?.length || 0;
      return { success: true, data: { deletedCount } };
    } catch (error) {
      console.error('Error in clearAllNotifications:', error);
      return { success: false, error };
    }
  }

  static async getNotificationStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notification_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error getting notification stats:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in getNotificationStats:', error);
      return { success: false, error };
    }
  }
}
