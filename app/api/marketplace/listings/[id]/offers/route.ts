import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get offers for a specific listing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Listing ID is required' },
        { status: 400 }
      );
    }

    // Verify listing exists
    const { data: listing, error: listingError } = await supabase
      .from('marketplace_listings')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('marketplace_offers')
      .select(`
        *,
        profiles!marketplace_offers_buyer_user_id_fkey (
          id,
          wallet_address,
          username,
          profile_image_url
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
      .eq('listing_id', id);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Only show non-expired offers by default
    if (status === 'pending') {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data: offers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching listing offers:', error);
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
    console.error('Error in listing offers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
