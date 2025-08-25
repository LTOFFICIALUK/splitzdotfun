import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Respond to an offer (accept, reject, counter)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      responseType, 
      counterAmount, 
      responseMessage, 
      responderUserId,
      transactionSignature 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    if (!responseType || !responderUserId) {
      return NextResponse.json(
        { success: false, error: 'Response type and responder user ID are required' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject', 'counter'].includes(responseType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response type' },
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

    // Validate responder is the seller
    if (offer.marketplace_listings.seller_user_id !== responderUserId) {
      return NextResponse.json(
        { success: false, error: 'Only the seller can respond to offers' },
        { status: 403 }
      );
    }

    // Validate counter offer amount if countering
    if (responseType === 'counter') {
      if (!counterAmount || counterAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Counter amount must be greater than 0' },
          { status: 400 }
        );
      }
    }

    // Create response record
    const { data: response, error: responseError } = await supabase
      .from('offer_responses')
      .insert({
        offer_id: id,
        response_type: responseType,
        counter_amount: counterAmount || null,
        response_message: responseMessage || null,
        responder_user_id: responderUserId
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error creating response:', responseError);
      return NextResponse.json(
        { success: false, error: 'Failed to create response' },
        { status: 500 }
      );
    }

    // Handle different response types
    let updatedOffer;
    let sale = null;

    if (responseType === 'accept') {
      // Accept the offer - create sale and update offer
      const { data: acceptedOffer, error: acceptError } = await supabase
        .from('marketplace_offers')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (acceptError) {
        console.error('Error accepting offer:', acceptError);
        return NextResponse.json(
          { success: false, error: 'Failed to accept offer' },
          { status: 500 }
        );
      }

      updatedOffer = acceptedOffer;

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

      const { data: createdSale, error: saleError } = await supabase
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

      sale = createdSale;

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

    } else if (responseType === 'reject') {
      // Reject the offer
      const { data: rejectedOffer, error: rejectError } = await supabase
        .from('marketplace_offers')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (rejectError) {
        console.error('Error rejecting offer:', rejectError);
        return NextResponse.json(
          { success: false, error: 'Failed to reject offer' },
          { status: 500 }
        );
      }

      updatedOffer = rejectedOffer;

    } else if (responseType === 'counter') {
      // Counter the offer
      const { data: counteredOffer, error: counterError } = await supabase
        .from('marketplace_offers')
        .update({
          status: 'countered',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (counterError) {
        console.error('Error countering offer:', counterError);
        return NextResponse.json(
          { success: false, error: 'Failed to counter offer' },
          { status: 500 }
        );
      }

      updatedOffer = counteredOffer;
    }

    return NextResponse.json({
      success: true,
      data: {
        offer: updatedOffer,
        response: response,
        sale: sale
      }
    });

  } catch (error) {
    console.error('Error responding to offer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
