import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - End auction manually (admin/seller only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { endedByUserId, forceEnd = false } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    // Get auction with all related data
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

    // Check if auction is already ended
    if (auction.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Auction is already ended' },
        { status: 400 }
      );
    }

    // Check if auction has naturally ended or if force end is allowed
    const now = new Date();
    const auctionEnd = new Date(auction.auction_end);
    const hasEnded = now > auctionEnd;

    if (!hasEnded && !forceEnd) {
      return NextResponse.json(
        { success: false, error: 'Auction has not ended yet' },
        { status: 400 }
      );
    }

    // Determine winner and process auction end
    let winner = null;
    let winningBid = null;
    let auctionStatus = 'ended';

    if (auction.current_bidder_user_id && auction.current_bid) {
      // Check if reserve price was met
      if (!auction.reserve_price || auction.current_bid >= auction.reserve_price) {
        winner = auction.current_bidder;
        winningBid = auction.current_bid;
        auctionStatus = 'sold';
      } else {
        // Reserve price not met
        auctionStatus = 'ended_no_reserve';
      }
    }

    // Update auction status
    const { data: updatedAuction, error: updateError } = await supabase
      .from('marketplace_auctions')
      .update({
        status: auctionStatus,
        winner_user_id: winner?.id || null,
        winning_bid: winningBid,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating auction status:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to end auction' },
        { status: 500 }
      );
    }

    // If auction was sold, process the sale
    if (auctionStatus === 'sold' && winner && winningBid) {
      const saleResult = await processAuctionSale(auction, winner, winningBid);
      
      if (!saleResult.success) {
        // Rollback auction status if sale processing failed
        await supabase
          .from('marketplace_auctions')
          .update({
            status: 'active',
            winner_user_id: null,
            winning_bid: null,
            ended_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        return NextResponse.json(
          { success: false, error: saleResult.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          auction: updatedAuction,
          sale: saleResult.sale,
          winner: winner,
          winningBid: winningBid
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        auction: updatedAuction,
        winner: winner,
        winningBid: winningBid,
        message: auctionStatus === 'ended_no_reserve' 
          ? 'Auction ended - reserve price not met' 
          : 'Auction ended successfully'
      }
    });

  } catch (error) {
    console.error('Error ending auction:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to process auction sale
async function processAuctionSale(auction: any, winner: any, winningBid: number) {
  try {
    // Calculate platform fee (10% of winning bid)
    const platformFee = winningBid * 0.1;
    const sellerAmount = winningBid - platformFee;

    // Create marketplace sale record
    const { data: sale, error: saleError } = await supabase
      .from('marketplace_sales')
      .insert({
        token_id: auction.token_id,
        seller_user_id: auction.seller_user_id,
        buyer_user_id: winner.id,
        sale_price_sol: winningBid,
        sale_type: 'auction_won',
        payment_method: 'sol',
        transaction_status: 'completed',
        sale_time: new Date().toISOString(),
        source_auction_id: auction.id,
        platform_fee_lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
        seller_amount_lamports: Math.floor(sellerAmount * LAMPORTS_PER_SOL)
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale record:', saleError);
      return { success: false, error: 'Failed to create sale record' };
    }

    // Record platform revenue
    const { error: revenueError } = await supabase
      .from('platform_revenue')
      .insert({
        revenue_type: 'sale_fee',
        amount_lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
        amount_sol: platformFee,
        source_sale_id: sale.id,
        source_token_id: auction.token_id,
        status: 'collected',
        collected_at: new Date().toISOString()
      });

    if (revenueError) {
      console.error('Error recording platform revenue:', revenueError);
      // Don't fail the sale for revenue recording errors
    }

    // Update token ownership (transfer to winner)
    const { error: ownershipError } = await supabase
      .from('tokens')
      .update({
        owner_user_id: winner.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', auction.token_id);

    if (ownershipError) {
      console.error('Error updating token ownership:', ownershipError);
      return { success: false, error: 'Failed to transfer token ownership' };
    }

    // Update all bids for this auction to 'ended'
    await supabase
      .from('auction_bids')
      .update({ status: 'ended' })
      .eq('auction_id', auction.id);

    return { success: true, sale };

  } catch (error) {
    console.error('Error processing auction sale:', error);
    return { success: false, error: 'Failed to process auction sale' };
  }
}
