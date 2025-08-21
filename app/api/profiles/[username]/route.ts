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

    // First try to find by username
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    // If not found by username, try to find by wallet address (in case username is the shortened wallet)
    if (!profile && username.includes('...')) {
      // Extract the pattern like "6m4GhW...eL9E"
      const parts = username.split('...');
      if (parts.length === 2) {
        const start = parts[0];
        const end = parts[1];
        
        // Find wallet addresses that match this pattern
        const { data: walletProfiles, error: walletError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('wallet_address', `${start}%${end}`);

        if (walletProfiles && walletProfiles.length > 0) {
          profile = walletProfiles[0];
        }
      }
    }

    if (error || !profile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse social_links if it's a string
    if (typeof profile.social_links === 'string') {
      try {
        profile.social_links = JSON.parse(profile.social_links);
      } catch (e) {
        profile.social_links = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
