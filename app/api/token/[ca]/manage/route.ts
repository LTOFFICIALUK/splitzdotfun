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

    // Update fees from BAGS API
    let updatedFeesGenerated = tokenData.fees_generated;
    try {
      console.log(`[GET] Fetching BAGS fees for contract: ${contractAddress}`);
      const bagsResponse = await fetch(`https://api2.bags.fm/api/v1/token-launch/lifetime-fees?tokenMint=${contractAddress}`);
      console.log(`[GET] BAGS response status: ${bagsResponse.status}`);
      
      if (bagsResponse.ok) {
        const bagsData = await bagsResponse.json();
        console.log(`[GET] BAGS API response:`, bagsData);
        
        if (bagsData.success && bagsData.response) {
          // Convert lamports to SOL
          const totalLifetimeFeesLamports = parseInt(bagsData.response);
          const totalLifetimeFeesSol = totalLifetimeFeesLamports / 1_000_000_000;
          
          // Calculate platform fees (20% of total)
          const platformFees = totalLifetimeFeesSol * 0.2;
          updatedFeesGenerated = platformFees.toFixed(8);

          // Get current fees from database to calculate incremental change
          const currentFeesGenerated = tokenData.fees_generated ? parseFloat(tokenData.fees_generated) : 0;
          const newFeesGenerated = parseFloat(updatedFeesGenerated);
          const incrementalFees = newFeesGenerated - currentFeesGenerated;

          console.log(`[GET] Fee calculation:`, { currentFeesGenerated, newFeesGenerated, incrementalFees });

          // Only update if there are new fees to distribute
          if (incrementalFees > 0) {
            // Update tokens table with new fees_generated
            await supabase
              .from('tokens')
              .update({ 
                fees_generated: updatedFeesGenerated,
                updated_at: new Date().toISOString()
              })
              .eq('contract_address', contractAddress);

            // Calculate incremental fees for each current earner
            const updatedFeesOwed = { ...feesOwedPerEarner };
            royaltyEarners.forEach((earner: any) => {
              const walletAddress = earner.social_or_wallet;
              const percentage = earner.percentage || 0;
              const incrementalEarned = incrementalFees * (percentage / 100);
              
              // Add to existing earnings
              const existingEarned = parseFloat(feesOwedPerEarner[walletAddress] || '0');
              const newTotal = existingEarned + incrementalEarned;
              updatedFeesOwed[walletAddress] = newTotal.toFixed(8);
              
              console.log(`[GET] Updated fees for ${walletAddress}:`, { percentage, existingEarned, incrementalEarned, newTotal });
            });

            // Update token_ownership table with incremental fees
            await supabase
              .from('token_ownership')
              .update({ 
                total_fees_earned: updatedFeesGenerated,
                fees_owed_per_earner: JSON.stringify(updatedFeesOwed),
                updated_at: new Date().toISOString()
              })
              .eq('token_id', tokenData.id);

            console.log(`[GET] Final updatedFeesOwed:`, updatedFeesOwed);
            console.log(`[GET] Updated incremental fees for ${contractAddress}: +${incrementalFees.toFixed(8)} SOL`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching BAGS fee data:', error);
    }

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
          let earned = 0;
          let claimed = 0;
          
          // Get actual earned amount from fees_owed_per_earner (preserves historical earnings)
          if (typeof feesOwedPerEarner === 'object' && feesOwedPerEarner[walletAddress]) {
            earned = parseFloat(feesOwedPerEarner[walletAddress] || '0');
          } else if (typeof feesOwedPerEarner === 'object' && feesOwedPerEarner.default) {
            // If fees are stored as a single value, distribute equally or use the percentage
            earned = parseFloat(feesOwedPerEarner.default || '0') * (earner.percentage / 100);
          } else {
            // Fallback to 0 if no data available
            earned = 0;
          }
          
          // Handle claimed fees from existing data
          if (typeof feesClaimedPerEarner === 'object' && feesClaimedPerEarner[walletAddress]) {
            claimed = parseFloat(feesClaimedPerEarner[walletAddress] || '0');
          } else if (typeof feesClaimedPerEarner === 'object' && feesClaimedPerEarner.default) {
            claimed = parseFloat(feesClaimedPerEarner.default || '0') * (earner.percentage / 100);
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
      updatedAt: tokenData.updated_at || null
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

    // Transform the new royalty recipients to match the database format
    const newRoyaltyEarners = royaltyRecipients.map((recipient: any) => ({
      role: recipient.role,
      percentage: recipient.percentage,
      social_or_wallet: recipient.social_or_wallet
    }));

    // Fetch latest fees from BAGS API and update database
    let newFeesGenerated = null;
    let newTotalFeesEarned = null;
    
    try {
      console.log(`[PUT] Fetching BAGS fees for contract: ${contractAddress}`);
      const bagsResponse = await fetch(`https://api2.bags.fm/api/v1/token-launch/lifetime-fees?tokenMint=${contractAddress}`);
      console.log(`[PUT] BAGS response status: ${bagsResponse.status}`);
      
      if (bagsResponse.ok) {
        const bagsData = await bagsResponse.json();
        console.log(`[PUT] BAGS API response:`, bagsData);
        
        if (bagsData.success && bagsData.response) {
          // Convert lamports to SOL
          const totalLifetimeFeesLamports = parseInt(bagsData.response);
          const totalLifetimeFeesSol = totalLifetimeFeesLamports / 1_000_000_000;
          
          // Calculate platform fees (20% of total)
          const platformFees = totalLifetimeFeesSol * 0.2;
          newFeesGenerated = platformFees.toFixed(8);
          newTotalFeesEarned = platformFees.toFixed(8);

          // Update tokens table with new fees_generated
          await supabase
            .from('tokens')
            .update({ 
              fees_generated: newFeesGenerated,
              updated_at: new Date().toISOString()
            })
            .eq('contract_address', contractAddress);

          // Update token_ownership table with new total_fees_earned
          await supabase
            .from('token_ownership')
            .update({ 
              total_fees_earned: newTotalFeesEarned,
              updated_at: new Date().toISOString()
            })
            .eq('token_id', tokenData.id);

          console.log(`Updated fees for ${contractAddress}: ${newFeesGenerated} SOL`);
        }
      }
    } catch (error) {
      console.error('Error fetching BAGS fee data:', error);
    }

    // Get current fees owed per earner to preserve existing earnings
    let currentFeesOwed = {};
    if (currentOwnership.fees_owed_per_earner) {
      try {
        if (typeof currentOwnership.fees_owed_per_earner === 'string') {
          currentFeesOwed = JSON.parse(currentOwnership.fees_owed_per_earner);
        } else if (typeof currentOwnership.fees_owed_per_earner === 'object') {
          currentFeesOwed = currentOwnership.fees_owed_per_earner;
        }
      } catch (e) {
        console.error('Error parsing current fees owed:', e);
        currentFeesOwed = {};
      }
    }

    // Calculate incremental fees since last update
    const currentFeesGenerated = currentOwnership.total_fees_earned ? parseFloat(currentOwnership.total_fees_earned) : 0;
    const newFeesGeneratedValue = newFeesGenerated ? parseFloat(newFeesGenerated) : currentFeesGenerated;
    const incrementalFees = newFeesGeneratedValue - currentFeesGenerated;
    
    console.log(`[PUT] Fee calculation:`, {
      currentFeesGenerated,
      newFeesGenerated,
      newFeesGeneratedValue,
      incrementalFees,
      currentFeesOwed
    });

    // Calculate new fees owed per earner based on new royalty structure
    // For existing recipients: preserve their current earnings + add incremental based on new split
    // For new recipients: start with 0 + add incremental based on new split
    const updatedFeesOwed = { ...currentFeesOwed };
    
    // Remove earnings for recipients no longer in the royalty structure
    const newWalletAddresses = newRoyaltyEarners.map((earner: any) => earner.social_or_wallet);
    Object.keys(updatedFeesOwed).forEach(walletAddress => {
      if (!newWalletAddresses.includes(walletAddress)) {
        delete updatedFeesOwed[walletAddress];
      }
    });

    // Add new recipients with 0 earnings if they don't exist
    newRoyaltyEarners.forEach((earner: any) => {
      const walletAddress = earner.social_or_wallet;
      if (!updatedFeesOwed.hasOwnProperty(walletAddress)) {
        updatedFeesOwed[walletAddress] = '0.00000000';
      }
    });

    // Add incremental fees based on new royalty split
    if (incrementalFees > 0) {
      newRoyaltyEarners.forEach((earner: any) => {
        const walletAddress = earner.social_or_wallet;
        const percentage = earner.percentage || 0;
        const incrementalEarned = incrementalFees * (percentage / 100);
        
        // Add to existing earnings
        const existingEarned = parseFloat(updatedFeesOwed[walletAddress] || '0');
        const newTotal = existingEarned + incrementalEarned;
        updatedFeesOwed[walletAddress] = newTotal.toFixed(8);
        
        console.log(`[PUT] Updated fees for ${walletAddress}:`, {
          percentage,
          existingEarned,
          incrementalEarned,
          newTotal
        });
      });
    }
    
    console.log(`[PUT] Final updatedFeesOwed:`, updatedFeesOwed);

    // Record the royalty change in history table
    await supabase
      .from('royalty_changes_history')
      .insert({
        token_id: tokenData.id,
        previous_royalty_earners: currentOwnership.royalty_earners || null,
        new_royalty_earners: JSON.stringify(newRoyaltyEarners),
        fees_at_change: currentOwnership.total_fees_earned || 0,
        changed_at: new Date().toISOString()
      });

    // Update the token_ownership record with new royalty structure and updated fees owed
    const { error: updateError } = await supabase
      .from('token_ownership')
      .update({
        royalty_earners: JSON.stringify(newRoyaltyEarners),
        fees_owed_per_earner: JSON.stringify(updatedFeesOwed),
        updated_at: new Date().toISOString()
      })
      .eq('token_id', tokenData.id);

    if (updateError) {
      console.error('Error updating royalty distribution:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update royalty distribution' },
        { status: 500 }
      );
    }

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
