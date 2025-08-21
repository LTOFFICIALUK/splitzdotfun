import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    const contractAddress = params.ca;

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }

    console.log('Fetching token data for contract address:', contractAddress);

    // Fetch token data from database
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select(`
        *,
        profiles!tokens_deployer_user_id_fkey (
          id,
          username,
          bio,
          profile_image_url
        )
      `)
      .eq('contract_address', contractAddress)
      .single();

    if (tokenError) {
      console.error('Error fetching token:', tokenError);
      return NextResponse.json({ 
        success: false, 
        error: 'Token not found',
        details: tokenError.message 
      }, { status: 404 });
    }

    // Fetch token ownership data
    const { data: ownership, error: ownershipError } = await supabase
      .from('token_ownership')
      .select('*')
      .eq('token_id', token.id)
      .single();

    if (ownershipError && ownershipError.code !== 'PGRST116') {
      console.error('Error fetching token ownership:', ownershipError);
    }

    return NextResponse.json({
      success: true,
      token: {
        ...token,
        ownership: ownership || null
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
