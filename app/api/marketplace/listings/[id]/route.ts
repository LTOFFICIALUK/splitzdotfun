import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const {
      listingPrice,
      description,
      newOwnerFeeShare,
      newFeeSplits
    } = body;

    if (!listingPrice || !newOwnerFeeShare || !newFeeSplits) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const activeFeeSplits = newFeeSplits.filter((split: any) => !split.isRemoved);
    const totalPercentage = activeFeeSplits.reduce((sum: number, split: any) => sum + split.percentage, 0) + newOwnerFeeShare;

    if (totalPercentage !== 100) {
      return NextResponse.json(
        { success: false, error: 'Total percentage must equal 100%' },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from('marketplace_listings')
      .update({
        listing_price: listingPrice,
        description: description || null,
        new_owner_fee_share: newOwnerFeeShare,
        proposed_fee_splits: activeFeeSplits,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (listingError) {
      console.error('Error updating listing:', listingError);
      return NextResponse.json(
        { success: false, error: 'Failed to update listing' },
        { status: 500 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: listing, message: 'Listing updated successfully' });

  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // First, get the listing to check if it exists and get the token address for redirect
    const { data: listing, error: fetchError } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        tokens!marketplace_listings_token_id_fkey (
          contract_address
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching listing:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Delete the listing
    const { error: deleteError } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting listing:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete listing' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Listing removed successfully',
      tokenAddress: listing.tokens?.contract_address
    });

  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
