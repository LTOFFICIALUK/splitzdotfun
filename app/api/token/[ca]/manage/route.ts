import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  try {
    const contractAddress = params.ca;

    // Fetch token data from Jupiter API
    let jupiterTokenData = null;
    try {
      const jupiterResponse = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${contractAddress}`);
      if (jupiterResponse.ok) {
        const jupiterData = await jupiterResponse.json();
        if (jupiterData && jupiterData.length > 0) {
          jupiterTokenData = jupiterData[0];
        }
      }
    } catch (error) {
      console.error('Error fetching Jupiter token data:', error);
    }



    // Fetch token data from our database
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('contract_address', contractAddress)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    // Fetch token ownership data
    const { data: ownershipData, error: ownershipError } = await supabase
      .from('token_ownership')
      .select('*')
      .eq('token_id', tokenData.id)
      .single();

    if (ownershipError) {
      console.error('Error fetching ownership data:', ownershipError);
    }

    // Fetch marketplace listing data
    const { data: marketplaceListing, error: listingError } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('token_id', tokenData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (listingError && listingError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching marketplace listing:', listingError);
    }

    // Debug logging
    console.log('Ownership data:', ownershipData);
    console.log('Royalty earners raw:', ownershipData?.royalty_earners);
    console.log('Royalty earners type:', typeof ownershipData?.royalty_earners);

    // Parse royalty earners JSON
    let royaltyEarners = [];
    if (ownershipData?.royalty_earners) {
      try {
        // Check if it's already an object or a string
        if (typeof ownershipData.royalty_earners === 'string') {
          royaltyEarners = JSON.parse(ownershipData.royalty_earners);
        } else if (Array.isArray(ownershipData.royalty_earners)) {
          royaltyEarners = ownershipData.royalty_earners;
        } else {
          console.error('Unexpected royalty_earners format:', typeof ownershipData.royalty_earners);
          royaltyEarners = [];
        }
      } catch (e) {
        console.error('Error parsing royalty earners:', e);
        royaltyEarners = [];
      }
    }

    // Parse fees owed and claimed
    let feesOwedPerEarner = {};
    let feesClaimedPerEarner = {};
    
    if (ownershipData?.fees_owed_per_earner) {
      try {
        if (typeof ownershipData.fees_owed_per_earner === 'string') {
          // Try to parse as JSON first, if it fails, treat as a simple string value
          try {
            feesOwedPerEarner = JSON.parse(ownershipData.fees_owed_per_earner);
          } catch {
            // If it's not valid JSON, treat it as a simple string value
            feesOwedPerEarner = { default: ownershipData.fees_owed_per_earner };
          }
        } else if (typeof ownershipData.fees_owed_per_earner === 'object') {
          feesOwedPerEarner = ownershipData.fees_owed_per_earner;
        }
      } catch (e) {
        console.error('Error parsing fees owed:', e);
      }
    }

    if (ownershipData?.fees_claimed_per_earner) {
      try {
        if (typeof ownershipData.fees_claimed_per_earner === 'string') {
          // Try to parse as JSON first, if it fails, treat as a simple string value
          try {
            feesClaimedPerEarner = JSON.parse(ownershipData.fees_claimed_per_earner);
          } catch {
            // If it's not valid JSON, treat it as a simple string value
            feesClaimedPerEarner = { default: ownershipData.fees_claimed_per_earner };
          }
        } else if (typeof ownershipData.fees_claimed_per_earner === 'object') {
          feesClaimedPerEarner = ownershipData.fees_claimed_per_earner;
        }
      } catch (e) {
        console.error('Error parsing fees claimed:', e);
      }
    }

    // Debug logging after parsing
    console.log('Parsed royalty earners:', royaltyEarners);
    console.log('Parsed fees owed:', feesOwedPerEarner);
    console.log('Parsed fees claimed:', feesClaimedPerEarner);

    // Get current fee balances from our professional tracking system
    const { data: tokenBalance, error: balanceError } = await supabase
      .from('token_balances_v')
      .select('*')
      .eq('token_id', tokenData.id)
      .single();

    if (balanceError) {
      console.error('Error fetching token balance:', balanceError);
    }

    // Get earner balances from our professional tracking system
    const { data: earnerBalances, error: earnerBalanceError } = await supabase
      .from('earner_token_balances_v')
      .select('*')
      .eq('token_id', tokenData.id);

    if (earnerBalanceError) {
      console.error('Error fetching earner balances:', earnerBalanceError);
    }

    // Use the professional fee tracking data
    let updatedFeesGenerated = tokenBalance?.lifetime_total_lamports ? tokenBalance.lifetime_total_lamports / 1e9 : tokenData.fees_generated;

    // Transform data to match the interface
    const transformedData = {
      id: tokenData.id,
      name: jupiterTokenData?.name || tokenData.name || 'NaN',
      symbol: jupiterTokenData?.symbol || tokenData.symbol || 'NaN',
      description: tokenData.description || 'NaN',
      imageUrl: jupiterTokenData?.icon || tokenData.image_url || null,
      bannerUrl: tokenData.banner_url || null,
      tokenAddress: tokenData.contract_address || 'NaN',
      creatorWallet: tokenData.deployer_social_or_wallet || 'NaN',
      totalSupply: jupiterTokenData?.totalSupply || null,
      circulatingSupply: jupiterTokenData?.stats24h?.buyVolume && jupiterTokenData?.stats24h?.sellVolume 
        ? (jupiterTokenData.stats24h.buyVolume + jupiterTokenData.stats24h.sellVolume) 
        : null,
      holders: jupiterTokenData?.holderCount || null,
      marketCap: jupiterTokenData?.mcap || null,
      priceChange24h: jupiterTokenData?.stats24h?.priceChange || null,
      feesGenerated: updatedFeesGenerated ? parseFloat(updatedFeesGenerated) : (tokenData.fees_generated ? parseFloat(tokenData.fees_generated) : null),
              royaltyRecipients: royaltyEarners.map((earner: any, index: number) => {
          const walletAddress = earner.social_or_wallet || 'NaN';
          
          // Get professional fee tracking data for this earner
          const earnerBalance = earnerBalances?.find((balance: any) => 
            balance.earner_wallet === walletAddress
          );
          
          // Use professional tracking data if available, fallback to old data
          let earned = 0;
          let claimed = 0;
          
          if (earnerBalance) {
            // Use our professional fee tracking system
            earned = earnerBalance.earned_total_lamports / 1e9; // Convert from lamports to SOL
            claimed = earnerBalance.paid_total_lamports / 1e9; // Convert from lamports to SOL
          } else {
            // Fallback to old data (for backward compatibility)
            const feesOwedObj = feesOwedPerEarner as { [key: string]: string };
            if (typeof feesOwedPerEarner === 'object' && feesOwedObj[walletAddress]) {
              earned = parseFloat(feesOwedObj[walletAddress] || '0');
            } else if (typeof feesOwedPerEarner === 'object' && feesOwedObj.default) {
              earned = parseFloat(feesOwedObj.default || '0') * (earner.percentage / 100);
            }
            
            const feesClaimedObj = feesClaimedPerEarner as { [key: string]: string };
            if (typeof feesClaimedPerEarner === 'object' && feesClaimedObj[walletAddress]) {
              claimed = parseFloat(feesClaimedObj[walletAddress] || '0');
            } else if (typeof feesClaimedPerEarner === 'object' && feesClaimedObj.default) {
              claimed = parseFloat(feesClaimedObj.default || '0') * (earner.percentage / 100);
            }
          }
        
        return {
          id: index.toString(),
          type: 'wallet', // Default to wallet type
          identifier: walletAddress,
          percentage: earner.percentage || 0,
          label: walletAddress,
          earned: earned,
          claimed: claimed,
          isManager: earner.role === 'Management',
          role: earner.role || 'NaN'
        };
      }),
      recentTransactions: [], // Not in current schema
      socialLink: tokenData.social_link || null,
      metadataUrl: tokenData.metadata_url || null,
      createdAt: tokenData.created_at || null,
      updatedAt: tokenData.updated_at || null,
      isListed: !!marketplaceListing,
      marketplaceListing: marketplaceListing ? {
        id: marketplaceListing.id,
        listing_price: marketplaceListing.listing_price,
        description: marketplaceListing.description,
        new_owner_fee_share: marketplaceListing.new_owner_fee_share,
        proposed_fee_splits: marketplaceListing.proposed_fee_splits,
        created_at: marketplaceListing.created_at
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching token management data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  try {
    const contractAddress = params.ca;
    const body = await request.json();
    const { royaltyRecipients } = body;

    // Fetch token data to get the token ID
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('contract_address', contractAddress)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    // Fetch current ownership data
    const { data: currentOwnership, error: ownershipError } = await supabase
      .from('token_ownership')
      .select('*')
      .eq('token_id', tokenData.id)
      .single();

    if (ownershipError) {
      return NextResponse.json(
        { success: false, error: 'Ownership data not found' },
        { status: 404 }
      );
    }

    // Use centralized royalty share update function
    console.log('🔄 Using centralized royalty share update...');
    
    const royaltyShares = royaltyRecipients.map((recipient: any) => ({
      earner_wallet: recipient.social_or_wallet,
      bps: Math.floor(recipient.percentage * 100), // Convert percentage to basis points
      role: recipient.role || 'Earner',
      is_manager: recipient.isManager || false
    }));

    // Call centralized royalty share update
    const royaltyUpdateResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/royalty-shares/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        token_id: tokenData.id,
        royalty_shares: royaltyShares,
        platform_fee_bps: 1000, // 10% platform fee
        updated_by_user_id: null, // Could be enhanced to get user ID
        reason: 'management_change'
      })
    });

    if (!royaltyUpdateResponse.ok) {
      const errorData = await royaltyUpdateResponse.json();
      console.error('❌ Error in centralized royalty update:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to update royalty shares', details: errorData },
        { status: 500 }
      );
    }

    console.log('✅ Centralized royalty share update completed');

    return NextResponse.json({
      success: true,
      message: 'Royalty distribution updated successfully'
    });

  } catch (error) {
    console.error('Error updating royalty distribution:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
