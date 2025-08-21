import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // First find the user profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_address')
      .eq('username', username)
      .single();

    // If not found by username, try to find by wallet address pattern
    if (!profile && username.includes('...')) {
      const parts = username.split('...');
      if (parts.length === 2) {
        const start = parts[0];
        const end = parts[1];
        
        const { data: walletProfiles } = await supabase
          .from('profiles')
          .select('id, wallet_address')
          .ilike('wallet_address', `${start}%${end}`);

        if (walletProfiles && walletProfiles.length > 0) {
          profile = walletProfiles[0];
        }
      }
    }

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find marketplace listings by this user
    const { data: listings, error: listingsError } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          image_url
        )
      `)
      .eq('seller_user_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: listings || []
    });

  } catch (error) {
    console.error('Error in user listings API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
