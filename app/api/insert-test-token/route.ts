import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    // First, create a test profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        wallet_address: 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
        username: 'test_deployer',
        bio: 'Test token deployer for demo purposes',
        profile_image_url: 'https://arweave.net/8AKeunEmIMk-UfVUnSR1SK0LKL2pGzlpQdDMBkbu5HM'
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    // Insert the token record
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .upsert({
        deployer_user_id: profile.id,
        deployer_social_or_wallet: 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
        name: 'BAGS Token',
        symbol: 'BAGS',
        description: 'A test token for demonstrating the SplitzFun platform features. This token showcases real-time charting, market data, and token management capabilities.',
        contract_address: 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
        token_link: 'https://splitz.fun/token/FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
        social_link: 'https://twitter.com/bagsapp',
        image_url: 'https://arweave.net/8AKeunEmIMk-UfVUnSR1SK0LKL2pGzlpQdDMBkbu5HM',
        banner_url: 'https://arweave.net/8AKeunEmIMk-UfVUnSR1SK0LKL2pGzlpQdDMBkbu5HM',
        metadata_url: 'https://arweave.net/metadata/bags-token.json',
        fees_generated: 1250.50
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Error creating token:', tokenError);
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    // Insert token ownership record
    const { data: ownership, error: ownershipError } = await supabase
      .from('token_ownership')
      .upsert({
        token_id: token.id,
        deployer_user_id: profile.id,
        current_owner: 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS',
        current_owner_user_id: profile.id,
        royalty_earners: [
          { social_or_wallet: 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS', role: 'Creator', percentage: 70 },
          { social_or_wallet: '@bagsapp', role: 'Management', percentage: 30 }
        ],
        ownership_history: [
          { owner: 'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS', from: '2024-01-01T00:00:00Z', to: null }
        ],
        total_fees_earned: 1250.50,
        fees_owed_per_earner: {
          'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS': 875.35,
          '@bagsapp': 375.15
        },
        fees_claimed_per_earner: {
          'FWmo8tr7ChpayuErxZEQ96twwTFYU7HA2E6J5ts8BAGS': 500.00,
          '@bagsapp': 200.00
        },
        total_fees_claimed: 700.00
      })
      .select()
      .single();

    if (ownershipError) {
      console.error('Error creating token ownership:', ownershipError);
      return NextResponse.json({ error: 'Failed to create token ownership' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test token created successfully',
      data: {
        profile,
        token,
        ownership
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
