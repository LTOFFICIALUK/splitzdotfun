import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get offer details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const { data: offer, error } = await supabase
      .from('marketplace_offers')
      .select(`
        *,
        marketplace_listings (
          id,
          listing_price,
          new_owner_fee_share,
          tokens (
            id,
            name,
            symbol,
            contract_address,
            image_url
          ),
          profiles!marketplace_listings_seller_user_id_fkey (
            id,
            wallet_address,
            username
          )
        ),
        profiles!marketplace_offers_buyer_user_id_fkey (
          id,
          wallet_address,
          username
        ),
        offer_responses (
          id,
          response_type,
          counter_amount,
          response_message,
          responder_user_id,
          created_at,
          profiles!offer_responses_responder_user_id_fkey (
            id,
            wallet_address,
            username
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching offer:', error);
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offer
    });

  } catch (error) {
    console.error('Error in offer details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Respond to an offer (accept, reject, counter)
export async function PUT(
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
      responderUserId 
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

    // Get the offer
    const { data: offer, error: fetchError } = await supabase
      .from('marketplace_offers')
      .select(`
        *,
        marketplace_listings (
          seller_user_id,
          is_active
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

    // Update offer status
    let newStatus = 'pending';
    if (responseType === 'accept') {
      newStatus = 'accepted';
    } else if (responseType === 'reject') {
      newStatus = 'rejected';
    } else if (responseType === 'counter') {
      newStatus = 'countered';
    }

    const { data: updatedOffer, error: updateError } = await supabase
      .from('marketplace_offers')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating offer:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update offer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        offer: updatedOffer,
        response: response
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
