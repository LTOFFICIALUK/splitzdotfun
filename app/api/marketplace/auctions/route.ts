import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Create a new auction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received auction data:', body);
    
    const { 
      tokenId, 
      startingBid, 
      reservePrice, 
      auctionDuration, // in hours
      sellerUserId 
    } = body;

    // Validate required fields
    if (!tokenId || !startingBid || !auctionDuration || !sellerUserId) {
      console.log('Missing required fields:', { tokenId, startingBid, auctionDuration, sellerUserId });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate auction duration (1-168 hours = 1 week max)
    if (auctionDuration < 1 || auctionDuration > 168) {
      return NextResponse.json(
        { success: false, error: 'Auction duration must be between 1 and 168 hours' },
        { status: 400 }
      );
    }

    // Calculate auction end time
    const auctionEnd = new Date();
    auctionEnd.setHours(auctionEnd.getHours() + auctionDuration);

    // Create the auction
    const { data: auction, error: auctionError } = await supabase
      .from('marketplace_auctions')
      .insert({
        token_id: tokenId,
        seller_user_id: sellerUserId,
        starting_bid: startingBid,
        reserve_price: reservePrice || null,
        current_bid: startingBid,
        auction_start: new Date().toISOString(),
        auction_end: auctionEnd.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (auctionError) {
      console.error('Error creating auction:', auctionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create auction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: auction
    });

  } catch (error) {
    console.error('Error in auction creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List auctions with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const status = searchParams.get('status') || 'active';
    const sellerUserId = searchParams.get('sellerUserId');

    let query = supabase
      .from('marketplace_auctions')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          image_url
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
      `);

    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (sellerUserId) {
      query = query.eq('seller_user_id', sellerUserId);
    }

    // Only show active auctions or auctions ending soon
    if (status === 'active') {
      query = query.gt('auction_end', new Date().toISOString());
    }

    const { data: auctions, error } = await query.order('auction_end', { ascending: true });

    if (error) {
      console.error('Error fetching auctions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch auctions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: auctions
    });

  } catch (error) {
    console.error('Error in auction listing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
