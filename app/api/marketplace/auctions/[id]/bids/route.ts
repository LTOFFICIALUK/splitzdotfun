import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get bid history for an auction
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
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('auction_bids')
      .select(`
        *,
        profiles!auction_bids_bidder_user_id_fkey (
          id,
          wallet_address,
          username,
          profile_image_url
        )
      `)
      .eq('auction_id', id);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: bids, error } = await query.order('bid_time', { ascending: false });

    if (error) {
      console.error('Error fetching bid history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bid history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bids
    });

  } catch (error) {
    console.error('Error in bid history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
