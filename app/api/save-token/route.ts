import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateTokenData, CreateTokenOwnershipData, RoyaltyEarner } from '@/types/tokens';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    const {
      deployer_user_id,
      deployer_social_or_wallet,
      name,
      symbol,
      description,
      contract_address,
      social_link,
      image_url,
      banner_url,
      metadata_url,
      royalty_earners
    } = body;

    // Validate required fields
    if (!deployer_social_or_wallet || !name || !symbol || !contract_address || !metadata_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create token link
    const token_link = `https://splitz.fun/token/${contract_address}`;

    // Prepare token data
    const tokenData: CreateTokenData = {
      deployer_user_id,
      deployer_social_or_wallet,
      name,
      symbol,
      description,
      contract_address,
      token_link,
      social_link,
      image_url,
      banner_url,
      metadata_url
    };

    console.log('💾 Saving token to database:', tokenData);

    // Insert token
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .insert(tokenData)
      .select()
      .single();

    if (tokenError) {
      console.error('❌ Error saving token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to save token', details: tokenError },
        { status: 500 }
      );
    }

    console.log('✅ Token saved successfully:', token.id);

    // Prepare ownership data
    const ownershipData: CreateTokenOwnershipData = {
      token_id: token.id,
      deployer_user_id,
      current_owner: deployer_social_or_wallet,
      current_owner_user_id: deployer_user_id,
      royalty_earners: royalty_earners || [],
      total_fees_earned: 0,
      fees_owed_per_earner: {},
      fees_claimed_per_earner: {},
      total_fees_claimed: 0
    };

    console.log('💾 Saving token ownership:', ownershipData);

    // Insert token ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from('token_ownership')
      .insert(ownershipData)
      .select()
      .single();

    if (ownershipError) {
      console.error('❌ Error saving token ownership:', ownershipError);
      return NextResponse.json(
        { error: 'Failed to save token ownership', details: ownershipError },
        { status: 500 }
      );
    }

    console.log('✅ Token ownership saved successfully:', ownership.id);

    return NextResponse.json({
      success: true,
      token,
      ownership,
      message: 'Token and ownership data saved successfully'
    });

  } catch (error) {
    console.error('❌ Error in save-token API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
