import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - End all expired auctions (called by GitHub Actions)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forceEnd = false, dryRun = false } = body;

    console.log('Starting expired auction end process...');

    // Get all active auctions that have ended
    const { data: expiredAuctions, error: fetchError } = await supabase
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
      .eq('status', 'active')
      .lt('auction_end', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired auctions:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expired auctions' },
        { status: 500 }
      );
    }

    console.log(`Found ${expiredAuctions?.length || 0} expired auctions`);

    if (!expiredAuctions || expiredAuctions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          processed: 0,
          ended: 0,
          sold: 0,
          failed: 0,
          message: 'No expired auctions found'
        }
      });
    }

    let processed = 0;
    let ended = 0;
    let sold = 0;
    let failed = 0;
    const results = [];

    for (const auction of expiredAuctions) {
      try {
        processed++;

        if (dryRun) {
          // Just simulate the process
          const wouldEnd = auction.current_bidder_user_id && auction.current_bid;
          const wouldSell = wouldEnd && (!auction.reserve_price || auction.current_bid >= auction.reserve_price);
          
          results.push({
            auctionId: auction.id,
            tokenName: auction.tokens.name,
            wouldEnd: true,
            wouldSell: wouldSell,
            currentBid: auction.current_bid,
            reservePrice: auction.reserve_price,
            winner: wouldSell ? auction.current_bidder?.username : null
          });

          if (wouldSell) sold++;
          else ended++;
          
          continue;
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
        const { error: updateError } = await supabase
          .from('marketplace_auctions')
          .update({
            status: auctionStatus,
            winner_user_id: winner?.id || null,
            winning_bid: winningBid,
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', auction.id);

        if (updateError) {
          console.error('Error updating auction status:', updateError);
          failed++;
          results.push({
            auctionId: auction.id,
            tokenName: auction.tokens.name,
            error: 'Failed to update auction status'
          });
          continue;
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
              .eq('id', auction.id);

            failed++;
            results.push({
              auctionId: auction.id,
              tokenName: auction.tokens.name,
              error: saleResult.error
            });
            continue;
          }

          sold++;
          results.push({
            auctionId: auction.id,
            tokenName: auction.tokens.name,
            status: 'sold',
            winner: winner.username,
            winningBid: winningBid,
            saleId: saleResult.sale?.id
          });
        } else {
          ended++;
          results.push({
            auctionId: auction.id,
            tokenName: auction.tokens.name,
            status: auctionStatus,
            reason: auctionStatus === 'ended_no_reserve' ? 'Reserve price not met' : 'No bids'
          });
        }

      } catch (error) {
        console.error('Error processing auction:', auction.id, error);
        failed++;
        results.push({
          auctionId: auction.id,
          tokenName: auction.tokens?.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Processed ${processed} auctions: ${sold} sold, ${ended} ended, ${failed} failed`);

    return NextResponse.json({
      success: true,
      data: {
        processed,
        ended,
        sold,
        failed,
        results,
        message: `Successfully processed ${processed} expired auctions`
      }
    });

  } catch (error) {
    console.error('Error in end expired auctions:', error);
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

    // Create notifications
    await createAuctionEndNotifications(auction, winner, winningBid);

    return { success: true, sale };

  } catch (error) {
    console.error('Error processing auction sale:', error);
    return { success: false, error: 'Failed to process auction sale' };
  }
}

// Helper function to create auction end notifications
async function createAuctionEndNotifications(auction: any, winner: any, winningBid: number) {
  try {
    // Notify seller
    await supabase
      .from('notifications')
      .insert({
        user_id: auction.seller_user_id,
        type: 'auction_ended',
        title: 'Auction Ended',
        message: `Your ${auction.tokens.name} auction ended with a winning bid of ${winningBid} SOL`,
        data: {
          auction_id: auction.id,
          token_name: auction.tokens.name,
          winning_bid: winningBid,
          winner_username: winner.username
        },
        read: false,
        created_at: new Date().toISOString()
      });

    // Notify winner
    await supabase
      .from('notifications')
      .insert({
        user_id: winner.id,
        type: 'auction_won',
        title: 'Auction Won!',
        message: `Congratulations! You won the ${auction.tokens.name} auction for ${winningBid} SOL`,
        data: {
          auction_id: auction.id,
          token_name: auction.tokens.name,
          winning_bid: winningBid
        },
        read: false,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Error creating auction end notifications:', error);
    // Don't fail the auction end for notification errors
  }
}
