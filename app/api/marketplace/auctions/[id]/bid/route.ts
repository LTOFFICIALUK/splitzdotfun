import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Place a bid on an auction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { bidAmount, bidderUserId, transactionSignature, bidderWalletAddress } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    if (!bidAmount || !bidderUserId || !bidderWalletAddress) {
      return NextResponse.json(
        { success: false, error: 'Bid amount, bidder user ID, and wallet address are required' },
        { status: 400 }
      );
    }

    // Validate bid amount
    if (bidAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Bid amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get current auction with all related data
    const { data: auction, error: fetchError } = await supabase
      .from('marketplace_auctions')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          owner_user_id
        ),
        profiles!marketplace_auctions_seller_user_id_fkey (
          id,
          wallet_address,
          username
        ),
        current_bidder:profiles!marketplace_auctions_current_bidder_user_id_fkey (
          id,
          wallet_address,
          username
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Check if auction is still active
    if (auction.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Auction is not active' },
        { status: 400 }
      );
    }

    // Check if auction has ended
    if (new Date() > new Date(auction.auction_end)) {
      return NextResponse.json(
        { success: false, error: 'Auction has ended' },
        { status: 400 }
      );
    }

    // Check if bidder is not the seller
    if (auction.seller_user_id === bidderUserId) {
      return NextResponse.json(
        { success: false, error: 'Seller cannot bid on their own auction' },
        { status: 400 }
      );
    }

    // Validate bid amount against current bid
    const minBidIncrement = 0.001; // 0.001 SOL minimum increment
    const currentBid = auction.current_bid || auction.starting_bid;
    
    if (bidAmount <= currentBid) {
      return NextResponse.json(
        { success: false, error: `Bid must be higher than current bid (${currentBid} SOL)` },
        { status: 400 }
      );
    }

    // Check minimum bid increment
    if (bidAmount < currentBid + minBidIncrement) {
      return NextResponse.json(
        { success: false, error: `Bid must be at least ${minBidIncrement} SOL higher than current bid` },
        { status: 400 }
      );
    }

    // Check reserve price
    if (auction.reserve_price && bidAmount < auction.reserve_price) {
      return NextResponse.json(
        { success: false, error: `Bid must meet reserve price (${auction.reserve_price} SOL)` },
        { status: 400 }
      );
    }

    // Validate wallet address format
    try {
      new PublicKey(bidderWalletAddress);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Verify payment if transaction signature is provided
    if (transactionSignature) {
      const paymentVerification = await verifyPayment(
        transactionSignature,
        bidderWalletAddress,
        auction.seller_user_id,
        bidAmount
      );

      if (!paymentVerification.success) {
        return NextResponse.json(
          { success: false, error: paymentVerification.error },
          { status: 400 }
        );
      }
    }

    // Get previous bidder for refund processing
    const previousBidder = auction.current_bidder_user_id;
    const previousBidAmount = auction.current_bid;

    // Start transaction - update auction with new bid
    const { data: updatedAuction, error: updateError } = await supabase
      .from('marketplace_auctions')
      .update({
        current_bid: bidAmount,
        current_bidder_user_id: bidderUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating auction bid:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to place bid' },
        { status: 500 }
      );
    }

    // Create bid record
    const { data: bid, error: bidError } = await supabase
      .from('auction_bids')
      .insert({
        auction_id: id,
        bidder_user_id: bidderUserId,
        bid_amount: bidAmount,
        transaction_signature: transactionSignature || null,
        bidder_wallet_address: bidderWalletAddress,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bidError) {
      console.error('Error creating bid record:', bidError);
      // Rollback auction update
      await supabase
        .from('marketplace_auctions')
        .update({
          current_bid: previousBidAmount,
          current_bidder_user_id: previousBidder,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      return NextResponse.json(
        { success: false, error: 'Failed to create bid record' },
        { status: 500 }
      );
    }

    // Process refund for previous bidder if exists
    if (previousBidder && previousBidAmount && previousBidder !== bidderUserId) {
      await processBidRefund(previousBidder, previousBidAmount, id);
    }

    // Update previous bidder's bid status to 'outbid'
    if (previousBidder && previousBidder !== bidderUserId) {
      await supabase
        .from('auction_bids')
        .update({ 
          status: 'outbid',
          updated_at: new Date().toISOString()
        })
        .eq('auction_id', id)
        .eq('bidder_user_id', previousBidder)
        .eq('status', 'active');
    }

    // Create notification for seller about new bid
            await createBidNotification(auction.seller_user_id, bidAmount, auction.tokens.name, bidderUserId, id);

    return NextResponse.json({
      success: true,
      data: {
        auction: updatedAuction,
        bid: bid,
        previousBidder: previousBidder,
        refundAmount: previousBidAmount
      }
    });

  } catch (error) {
    console.error('Error placing bid:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to verify payment
async function verifyPayment(
  transactionSignature: string,
  bidderWalletAddress: string,
  sellerUserId: string,
  bidAmount: number
) {
  try {
    // Initialize Solana connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Get transaction details
    const transaction = await connection.getTransaction(transactionSignature, {
      commitment: 'confirmed'
    });

    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    // Verify transaction amount matches bid amount
    if (!transaction.meta?.postBalances || !transaction.meta?.preBalances) {
      return { success: false, error: 'Transaction metadata is incomplete' };
    }
    
    const transactionAmount = transaction.meta.postBalances[0] - transaction.meta.preBalances[0];
    const expectedAmount = bidAmount * LAMPORTS_PER_SOL;

    if (Math.abs(transactionAmount) < expectedAmount * 0.99) { // Allow 1% tolerance
      return { success: false, error: 'Transaction amount does not match bid amount' };
    }

    // Verify transaction is confirmed
    if (transaction.meta.err) {
      return { success: false, error: 'Transaction failed' };
    }

    return { success: true };

  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: 'Failed to verify payment' };
  }
}

// Helper function to process bid refund
async function processBidRefund(bidderUserId: string, bidAmount: number, auctionId: string) {
  try {
    // Get bidder's wallet address
    const { data: bidder, error: bidderError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', bidderUserId)
      .single();

    if (bidderError || !bidder) {
      console.error('Error getting bidder wallet address:', bidderError);
      return { success: false, error: 'Failed to get bidder wallet address' };
    }

    // Create refund record
    const { error: refundError } = await supabase
      .from('auction_refunds')
      .insert({
        auction_id: auctionId,
        bidder_user_id: bidderUserId,
        refund_amount: bidAmount,
        bidder_wallet_address: bidder.wallet_address,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (refundError) {
      console.error('Error creating refund record:', refundError);
      return { success: false, error: 'Failed to create refund record' };
    }

    // In a real implementation, you would process the actual SOL refund here
    // For now, we just mark it as processed
    await supabase
      .from('auction_refunds')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('auction_id', auctionId)
      .eq('bidder_user_id', bidderUserId);

    return { success: true };

  } catch (error) {
    console.error('Error processing bid refund:', error);
    return { success: false, error: 'Failed to process refund' };
  }
}

// Helper function to create bid notification
async function createBidNotification(
  sellerUserId: string,
  bidAmount: number,
  tokenName: string,
  bidderUserId: string,
  auctionId: string
) {
  try {
    // Get bidder username
    const { data: bidder, error: bidderError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', bidderUserId)
      .single();

    const bidderUsername = bidder?.username || 'Unknown User';

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: sellerUserId,
        type: 'new_bid',
        title: 'New Bid Received',
        message: `${bidderUsername} placed a bid of ${bidAmount} SOL on your ${tokenName} auction`,
        data: {
          auction_id: auctionId,
          bid_amount: bidAmount,
          bidder_user_id: bidderUserId,
          bidder_username: bidderUsername
        },
        read: false,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Error creating bid notification:', error);
    // Don't fail the bid for notification errors
  }
}
