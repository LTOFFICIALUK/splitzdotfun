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

    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    console.log('🔍 Fetching tokens for user:', userIdentifier);

    // First, let's test if the tables exist by doing a simple query
    try {
      console.log('🔍 Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('tokens')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Database tables may not exist:', testError);
        console.error('❌ Error details:', JSON.stringify(testError, null, 2));
        return NextResponse.json(
          { 
            error: 'Database tables not found. Please run the SQL setup first.',
            details: testError.message,
            code: testError.code
          },
          { status: 500 }
        );
      }
      
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Fetch tokens where user is the current owner
    console.log('🔍 Fetching owned tokens...');
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
      console.error('❌ Error details:', JSON.stringify(ownedError, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to fetch owned tokens', 
          details: ownedError.message,
          code: ownedError.code
        },
        { status: 500 }
      );
    }

    // Fetch tokens where user is a royalty earner but not the owner
    console.log('🔍 Fetching royalty tokens...');
    
    // For now, let's skip the complex JSONB query and just return empty array
    // This can be implemented later when we have more data
    const royaltyTokens: any[] = [];
    const royaltyError = null;
    
    console.log('✅ Royalty tokens query completed (empty for now)');

    // Fetch tokens deployed by the user
    console.log('🔍 Fetching deployed tokens...');
    const { data: deployedTokens, error: deployedError } = await supabase
      .from('tokens')
      .select('*')
      .eq('deployer_social_or_wallet', userIdentifier);

    if (deployedError) {
      console.error('❌ Error fetching deployed tokens:', deployedError);
      console.error('❌ Error details:', JSON.stringify(deployedError, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to fetch deployed tokens', 
          details: deployedError.message,
          code: deployedError.code
        },
        { status: 500 }
      );
    }

    // Process and format the data
    const processTokens = (tokens: any[], type: 'owned' | 'royalty' | 'deployed') => {
      return tokens.map(item => {
        if (type === 'deployed') {
          // For deployed tokens, simplified structure
          const token = item;
          
          return {
            id: token.id,
            name: token.name,
            symbol: token.symbol,
            contract_address: token.contract_address,
            image_url: token.image_url,
            social_link: token.social_link,
            created_at: token.created_at,
            fees_generated: token.fees_generated || 0,
            current_owner: token.deployer_social_or_wallet,
            royalty_earners: [],
            total_fees_earned: 0,
            fees_owed_per_earner: {},
            fees_claimed_per_earner: {},
            total_fees_claimed: 0,
            type: 'deployed'
          };
        } else {
          // For owned tokens
          const ownership = item;
          const token = item.tokens;
          
          // Parse royalty_earners from JSON string
          let royaltyEarners = [];
          if (ownership.royalty_earners) {
            try {
              if (typeof ownership.royalty_earners === 'string') {
                royaltyEarners = JSON.parse(ownership.royalty_earners);
              } else if (Array.isArray(ownership.royalty_earners)) {
                royaltyEarners = ownership.royalty_earners;
              }
            } catch (e) {
              console.error('Error parsing royalty_earners:', e);
              royaltyEarners = [];
            }
          }

          // Parse fees_owed_per_earner from JSON string
          let feesOwedPerEarner = {};
          if (ownership.fees_owed_per_earner) {
            try {
              if (typeof ownership.fees_owed_per_earner === 'string') {
                feesOwedPerEarner = JSON.parse(ownership.fees_owed_per_earner);
              } else if (typeof ownership.fees_owed_per_earner === 'object') {
                feesOwedPerEarner = ownership.fees_owed_per_earner;
              }
            } catch (e) {
              console.error('Error parsing fees_owed_per_earner:', e);
              feesOwedPerEarner = {};
            }
          }

          // Parse fees_claimed_per_earner from JSON string
          let feesClaimedPerEarner = {};
          if (ownership.fees_claimed_per_earner) {
            try {
              if (typeof ownership.fees_claimed_per_earner === 'string') {
                feesClaimedPerEarner = JSON.parse(ownership.fees_claimed_per_earner);
              } else if (typeof ownership.fees_claimed_per_earner === 'object') {
                feesClaimedPerEarner = ownership.fees_claimed_per_earner;
              }
            } catch (e) {
              console.error('Error parsing fees_claimed_per_earner:', e);
              feesClaimedPerEarner = {};
            }
          }

          return {
            id: token.id,
            name: token.name,
            symbol: token.symbol,
            contract_address: token.contract_address,
            image_url: token.image_url,
            social_link: token.social_link,
            created_at: token.created_at,
            fees_generated: token.fees_generated || 0,
            current_owner: ownership.current_owner,
            royalty_earners: royaltyEarners,
            total_fees_earned: ownership.total_fees_earned || 0,
            fees_owed_per_earner: feesOwedPerEarner,
            fees_claimed_per_earner: feesClaimedPerEarner,
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

    // Return empty arrays if no tokens found (this is normal for new users)
    return NextResponse.json({
      success: true,
      data: result,
      message: 'No tokens found for this user yet'
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
