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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      wallet_address, 
      username, 
      bio, 
      profile_image_url, 
      social_links, 
      oauth_verifications 
    } = body;

    // Validate required fields
    if (!wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing profile:', checkError);
      return NextResponse.json(
        { success: false, error: 'Failed to check existing profile' },
        { status: 500 }
      );
    }

    if (existingProfile) {
      // Return the existing profile instead of an error
      return NextResponse.json({
        success: true,
        data: existingProfile,
        message: 'Profile already exists'
      });
    }

    // Create new profile
    const { data: profile, error: createError } = await supabase
      .from('profiles')
      .insert({
        wallet_address,
        username: username || null,
        bio: bio || null,
        profile_image_url: profile_image_url || null,
        social_links: social_links || [],
        oauth_verifications: oauth_verifications || {}
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return NextResponse.json(
        { success: false, error: `Failed to create profile: ${createError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile created successfully'
    });

  } catch (error) {
    console.error('Error in profiles POST API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
