import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const walletAddress = searchParams.get('wallet');

    let query = supabase
      .from('profiles')
      .select('*');

    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress);
    }

    const { data: profiles, error } = await query
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profiles
    });

  } catch (error) {
    console.error('Error in profiles API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
