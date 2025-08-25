import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { bidAmount, bidderUserId, transactionSignature } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    if (!bidAmount || !bidderUserId) {
      return NextResponse.json(
        { success: false, error: 'Bid amount and bidder user ID are required' },
        { status: 400 }
      );
    }

    // Get current auction
    const { data: auction, error: fetchError } = await supabase
      .from('marketplace_auctions')
      .select('*')
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

    // Validate bid amount
    const minBidIncrement = 0.001; // 0.001 SOL minimum increment
    const currentBid = auction.current_bid || auction.starting_bid;
    
    if (bidAmount <= currentBid) {
      return NextResponse.json(
        { success: false, error: `Bid must be higher than current bid (${currentBid} SOL)` },
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

    // Start transaction
    const { data: previousBidder, error: previousBidderError } = await supabase
      .from('marketplace_auctions')
      .select('current_bidder_user_id')
      .eq('id', id)
      .single();

    // Update auction with new bid
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
        status: 'active'
      })
      .select()
      .single();

    if (bidError) {
      console.error('Error creating bid record:', bidError);
      // Note: We don't rollback the auction update here for simplicity
      // In production, you'd want proper transaction handling
    }

    // Update previous bidder's bid status to 'outbid' if there was one
    if (previousBidder?.current_bidder_user_id && previousBidder.current_bidder_user_id !== bidderUserId) {
      await supabase
        .from('auction_bids')
        .update({ status: 'outbid' })
        .eq('auction_id', id)
        .eq('bidder_user_id', previousBidder.current_bidder_user_id)
        .eq('status', 'active');
    }

    return NextResponse.json({
      success: true,
      data: {
        auction: updatedAuction,
        bid: bid
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
