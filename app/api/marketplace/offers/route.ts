import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Create a new offer on a listing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received offer data:', body);
    
    const { 
      listingId, 
      offerAmount, 
      offerMessage, 
      buyerUserId,
      expiresInHours = 24 // Default 24 hours
    } = body;

    // Validate required fields
    if (!listingId || !offerAmount || !buyerUserId) {
      console.log('Missing required fields:', { listingId, offerAmount, buyerUserId });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate offer amount
    if (offerAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Offer amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate expiration time (1-168 hours = 1 week max)
    if (expiresInHours < 1 || expiresInHours > 168) {
      return NextResponse.json(
        { success: false, error: 'Offer expiration must be between 1 and 168 hours' },
        { status: 400 }
      );
    }

    // Check if listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('id', listingId)
      .eq('is_active', true)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found or not active' },
        { status: 404 }
      );
    }

    // Check if buyer is not the seller
    if (listing.seller_user_id === buyerUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot make offer on your own listing' },
        { status: 400 }
      );
    }

    // Check if there's already a pending offer from this buyer
    const { data: existingOffer, error: existingError } = await supabase
      .from('marketplace_offers')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_user_id', buyerUserId)
      .eq('status', 'pending')
      .single();

    if (existingOffer) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending offer on this listing' },
        { status: 400 }
      );
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create the offer
    const { data: offer, error: offerError } = await supabase
      .from('marketplace_offers')
      .insert({
        listing_id: listingId,
        buyer_user_id: buyerUserId,
        offer_amount: offerAmount,
        offer_message: offerMessage || null,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
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
        )
      `)
      .single();

    if (offerError) {
      console.error('Error creating offer:', offerError);
      return NextResponse.json(
        { success: false, error: 'Failed to create offer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offer
    });

  } catch (error) {
    console.error('Error in offer creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List offers with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');
    const buyerUserId = searchParams.get('buyerUserId');
    const sellerUserId = searchParams.get('sellerUserId');
    const status = searchParams.get('status') || 'all';

    let query = supabase
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
        )
      `);

    if (listingId) {
      query = query.eq('listing_id', listingId);
    }

    if (buyerUserId) {
      query = query.eq('buyer_user_id', buyerUserId);
    }

    if (sellerUserId) {
      // Filter by seller through the listing relationship
      query = query.eq('marketplace_listings.seller_user_id', sellerUserId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Only show non-expired offers by default
    if (status === 'pending') {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data: offers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching offers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch offers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offers
    });

  } catch (error) {
    console.error('Error in offer listing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
