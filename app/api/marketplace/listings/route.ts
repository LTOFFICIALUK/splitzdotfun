import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received listing data:', body);
    
    const { 
      tokenId, 
      listingPrice, 
      description, 
      newOwnerFeeShare, 
      newFeeSplits,
      sellerUserId 
    } = body;

    // Validate required fields
    if (!tokenId || !listingPrice || !newOwnerFeeShare || !newFeeSplits || !sellerUserId) {
      console.log('Missing required fields:', { tokenId, listingPrice, newOwnerFeeShare, newFeeSplits, sellerUserId });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that total percentage equals 100%
    const totalPercentage = newFeeSplits
      .filter((split: any) => !split.isRemoved)
      .reduce((sum: number, split: any) => sum + split.percentage, 0) + newOwnerFeeShare;

    if (totalPercentage !== 100) {
      return NextResponse.json(
        { success: false, error: 'Total fee percentage must equal 100%' },
        { status: 400 }
      );
    }

    // Create the marketplace listing
    const { data: listing, error: listingError } = await supabase
      .from('marketplace_listings')
      .insert({
        token_id: tokenId,
        seller_user_id: sellerUserId,
        listing_price: listingPrice,
        description: description || null,
        new_owner_fee_share: newOwnerFeeShare,
        proposed_fee_splits: newFeeSplits,
        is_active: true,
        is_sold: false
      })
      .select()
      .single();

    if (listingError) {
      console.error('Error creating marketplace listing:', listingError);
      console.error('Listing data that failed:', {
        token_id: tokenId,
        seller_user_id: sellerUserId,
        listing_price: listingPrice,
        description: description || null,
        new_owner_fee_share: newOwnerFeeShare,
        proposed_fee_splits: newFeeSplits,
        is_active: true,
        is_sold: false
      });
      return NextResponse.json(
        { success: false, error: `Failed to create listing: ${listingError.message}` },
        { status: 500 }
      );
    }

    // Update the token to mark it as listed
    const { error: tokenError } = await supabase
      .from('tokens')
      .update({ is_listed: true })
      .eq('id', tokenId);

    if (tokenError) {
      console.error('Error updating token listing status:', tokenError);
      // Don't fail the request if this fails, but log it
    }

    return NextResponse.json({
      success: true,
      data: listing,
      message: 'Listing created successfully'
    });

  } catch (error) {
    console.error('Error in marketplace listings API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let query = supabase
      .from('marketplace_listings')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          image_url
        ),
        profiles!seller_user_id (
          id,
          wallet_address,
          username
        )
      `);

    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: listings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching marketplace listings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: listings
    });

  } catch (error) {
    console.error('Error in marketplace listings GET API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
