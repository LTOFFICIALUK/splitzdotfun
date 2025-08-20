import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userIdentifier = searchParams.get('user'); // Can be wallet address or social handle
    
    if (!userIdentifier) {
      return NextResponse.json(
        { error: 'User identifier is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching tokens for user:', userIdentifier);

    // Fetch tokens where user is the current owner
    const { data: ownedTokens, error: ownedError } = await supabase
      .from('token_ownership')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          image_url,
          social_link,
          created_at,
          fees_generated
        )
      `)
      .eq('current_owner', userIdentifier);

    if (ownedError) {
      console.error('❌ Error fetching owned tokens:', ownedError);
      return NextResponse.json(
        { error: 'Failed to fetch owned tokens', details: ownedError },
        { status: 500 }
      );
    }

    // Fetch tokens where user is a royalty earner but not the owner
    const { data: royaltyTokens, error: royaltyError } = await supabase
      .from('token_ownership')
      .select(`
        *,
        tokens (
          id,
          name,
          symbol,
          contract_address,
          image_url,
          social_link,
          created_at,
          fees_generated
        )
      `)
      .neq('current_owner', userIdentifier)
      .contains('royalty_earners', [{ social_or_wallet: userIdentifier }]);

    if (royaltyError) {
      console.error('❌ Error fetching royalty tokens:', royaltyError);
      return NextResponse.json(
        { error: 'Failed to fetch royalty tokens', details: royaltyError },
        { status: 500 }
      );
    }

    // Fetch tokens deployed by the user
    const { data: deployedTokens, error: deployedError } = await supabase
      .from('tokens')
      .select(`
        *,
        token_ownership (
          id,
          current_owner,
          royalty_earners,
          total_fees_earned,
          fees_owed_per_earner,
          fees_claimed_per_earner,
          total_fees_claimed
        )
      `)
      .eq('deployer_social_or_wallet', userIdentifier);

    if (deployedError) {
      console.error('❌ Error fetching deployed tokens:', deployedError);
      return NextResponse.json(
        { error: 'Failed to fetch deployed tokens', details: deployedError },
        { status: 500 }
      );
    }

    // Process and format the data
    const processTokens = (tokens: any[], type: 'owned' | 'royalty' | 'deployed') => {
      return tokens.map(item => {
        if (type === 'deployed') {
          // For deployed tokens, the structure is different
          const token = item;
          const ownership = item.token_ownership?.[0] || {};
          
          return {
            id: token.id,
            name: token.name,
            symbol: token.symbol,
            contract_address: token.contract_address,
            image_url: token.image_url,
            social_link: token.social_link,
            created_at: token.created_at,
            fees_generated: token.fees_generated,
            current_owner: ownership.current_owner,
            royalty_earners: ownership.royalty_earners || [],
            total_fees_earned: ownership.total_fees_earned || 0,
            fees_owed_per_earner: ownership.fees_owed_per_earner || {},
            fees_claimed_per_earner: ownership.fees_claimed_per_earner || {},
            total_fees_claimed: ownership.total_fees_claimed || 0,
            type: 'deployed'
          };
        } else {
          // For owned and royalty tokens
          const ownership = item;
          const token = item.tokens;
          
          return {
            id: token.id,
            name: token.name,
            symbol: token.symbol,
            contract_address: token.contract_address,
            image_url: token.image_url,
            social_link: token.social_link,
            created_at: token.created_at,
            fees_generated: token.fees_generated,
            current_owner: ownership.current_owner,
            royalty_earners: ownership.royalty_earners || [],
            total_fees_earned: ownership.total_fees_earned || 0,
            fees_owed_per_earner: ownership.fees_owed_per_earner || {},
            fees_claimed_per_earner: ownership.fees_claimed_per_earner || {},
            total_fees_claimed: ownership.total_fees_claimed || 0,
            type
          };
        }
      });
    };

    const result = {
      owned: processTokens(ownedTokens || [], 'owned'),
      royalty: processTokens(royaltyTokens || [], 'royalty'),
      deployed: processTokens(deployedTokens || [], 'deployed')
    };

    console.log(`✅ Found ${result.owned.length} owned, ${result.royalty.length} royalty, ${result.deployed.length} deployed tokens`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error in user-tokens API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
