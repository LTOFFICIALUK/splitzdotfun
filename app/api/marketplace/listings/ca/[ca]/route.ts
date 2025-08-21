import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  try {
    const { ca } = params;

    if (!ca) {
      return NextResponse.json(
        { success: false, error: 'Contract address is required' },
        { status: 400 }
      );
    }

    // First, find the token by contract address
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('id, name, symbol, contract_address, image_url')
      .eq('contract_address', ca)
      .single();

    if (tokenError) {
      console.error('Token error:', tokenError);
      return NextResponse.json(
        { success: false, error: `Token not found: ${tokenError.message}` },
        { status: 404 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    // Then, find the most recent active marketplace listing for this token
    const { data: listings, error: listingError } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        profiles!marketplace_listings_seller_user_id_fkey (
          id,
          wallet_address,
          username,
          bio,
          profile_image_url,
          social_links
        )
      `)
      .eq('token_id', token.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (listingError) {
      console.error('Listing error:', listingError);
      return NextResponse.json(
        { success: false, error: `Failed to fetch listing: ${listingError.message}` },
        { status: 500 }
      );
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active listing found for this token' },
        { status: 404 }
      );
    }

    const listing = listings[0];

    // Log the listing data for debugging
    console.log('Found listing:', {
      id: listing.id,
      seller_user_id: listing.seller_user_id,
      profiles: listing.profiles
    });

    // Combine token and listing data
    const combinedData = {
      ...listing,
      tokens: token
    };

    return NextResponse.json({
      success: true,
      data: combinedData
    });

  } catch (error) {
    console.error('Error in marketplace listing API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
