import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Reject an offer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { sellerUserId, rejectionReason } = body;

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

    // Validate seller is the one rejecting
    if (offer.marketplace_listings.seller_user_id !== sellerUserId) {
      return NextResponse.json(
        { success: false, error: 'Only the seller can reject offers' },
        { status: 403 }
      );
    }

    // Create response record
    const { data: response, error: responseError } = await supabase
      .from('offer_responses')
      .insert({
        offer_id: id,
        response_type: 'reject',
        response_message: rejectionReason || 'Offer rejected by seller',
        responder_user_id: sellerUserId
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
    const { data: updatedOffer, error: updateError } = await supabase
      .from('marketplace_offers')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating offer:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to reject offer' },
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
    console.error('Error rejecting offer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
