import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get auction details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    const { data: auction, error } = await supabase
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
          username,
          profile_image_url
        ),
        current_bidder:profiles!marketplace_auctions_current_bidder_user_id_fkey (
          id,
          wallet_address,
          username
        ),
        winner:profiles!marketplace_auctions_winner_user_id_fkey (
          id,
          wallet_address,
          username
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching auction:', error);
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: auction
    });

  } catch (error) {
    console.error('Error in auction details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - End auction manually (admin/seller only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, userId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    if (action !== 'end') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
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

    // Check if user is seller or admin
    if (auction.seller_user_id !== userId) {
      // TODO: Add admin check here
      return NextResponse.json(
        { success: false, error: 'Unauthorized to end this auction' },
        { status: 403 }
      );
    }

    // Check if auction is already ended
    if (auction.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Auction is already ended' },
        { status: 400 }
      );
    }

    // Determine winner and update auction
    let updateData: any = {
      status: 'ended',
      updated_at: new Date().toISOString()
    };

    if (auction.current_bidder_user_id && auction.current_bid >= (auction.reserve_price || 0)) {
      // Auction has a winner
      updateData.winner_user_id = auction.current_bidder_user_id;
      updateData.winning_bid = auction.current_bid;
      updateData.status = 'sold';

      // Create auction winner record
      await supabase
        .from('auction_winners')
        .insert({
          auction_id: id,
          winner_user_id: auction.current_bidder_user_id,
          winning_bid: auction.current_bid,
          payment_status: 'pending'
        });
    }

    // Update auction
    const { data: updatedAuction, error: updateError } = await supabase
      .from('marketplace_auctions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating auction:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to end auction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedAuction
    });

  } catch (error) {
    console.error('Error ending auction:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
