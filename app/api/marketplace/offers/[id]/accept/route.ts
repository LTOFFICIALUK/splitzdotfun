import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Accept an offer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { sellerUserId, transactionSignature } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    if (!sellerUserId) {
      return NextResponse.json(
        { success: false, error: 'Seller user ID is required' },
        { status: 400 }
      );
    }

    // Get the offer with listing details
    const { data: offer, error: fetchError } = await supabase
      .from('marketplace_offers')
      .select(`
        *,
        marketplace_listings (
          id,
          seller_user_id,
          is_active,
          listing_price,
          tokens (
            id,
            name,
            symbol,
            contract_address
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Check if offer is still pending
    if (offer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Offer is no longer pending' },
        { status: 400 }
      );
    }

    // Check if offer has expired
    if (new Date() > new Date(offer.expires_at)) {
      return NextResponse.json(
        { success: false, error: 'Offer has expired' },
        { status: 400 }
      );
    }

    // Check if listing is still active
    if (!offer.marketplace_listings.is_active) {
      return NextResponse.json(
        { success: false, error: 'Listing is no longer active' },
        { status: 400 }
      );
    }

    // Validate seller is the one accepting
    if (offer.marketplace_listings.seller_user_id !== sellerUserId) {
      return NextResponse.json(
        { success: false, error: 'Only the seller can accept offers' },
        { status: 403 }
      );
    }

    // Start transaction - update offer status and create sale
    const { data: updatedOffer, error: updateError } = await supabase
      .from('marketplace_offers')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating offer:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to accept offer' },
        { status: 500 }
      );
    }

    // Create marketplace sale record
    const saleData = {
      token_id: offer.marketplace_listings.tokens.id,
      seller_user_id: offer.marketplace_listings.seller_user_id,
      buyer_user_id: offer.buyer_user_id,
      sale_price_sol: offer.offer_amount,
      sale_type: 'offer_accepted',
      payment_method: 'sol',
      transaction_status: 'pending',
      transaction_signature: transactionSignature || null,
      sale_time: new Date().toISOString(),
      source_offer_id: id
    };

    // Calculate platform fee (10% of sale price)
    const salePriceLamports = Math.floor(offer.offer_amount * 1000000000);
    const platformFeeLamports = Math.floor((salePriceLamports * 10) / 100);
    const sellerAmountLamports = salePriceLamports - platformFeeLamports;

    const saleDataWithFees = {
      ...saleData,
      platform_fee_lamports: platformFeeLamports,
      seller_amount_lamports: sellerAmountLamports
    };

    const { data: sale, error: saleError } = await supabase
      .from('marketplace_sales')
      .insert(saleDataWithFees)
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale:', saleError);
      // Rollback offer status
      await supabase
        .from('marketplace_offers')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      return NextResponse.json(
        { success: false, error: 'Failed to create sale' },
        { status: 500 }
      );
    }

    // Deactivate the listing
    await supabase
      .from('marketplace_listings')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', offer.listing_id);

    // Reject all other pending offers on this listing
    await supabase
      .from('marketplace_offers')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', offer.listing_id)
      .eq('status', 'pending')
      .neq('id', id);

    // Record platform revenue from sale fee
    if (sale && sale.status === 'completed') {
      await supabase
        .from('platform_revenue')
        .insert({
          revenue_type: 'sale_fee',
          amount_lamports: platformFeeLamports,
          source_sale_id: sale.id,
          source_token_id: sale.token_id,
          status: 'collected'
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        offer: updatedOffer,
        sale: sale
      }
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
