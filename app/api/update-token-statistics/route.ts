import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JupiterTokenStats, CreateTokenStatisticsData } from '@/types/token-statistics';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to fetch Jupiter token data
const fetchJupiterTokenData = async (contractAddress: string): Promise<JupiterTokenStats | null> => {
  try {
    const response = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${contractAddress}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`❌ Jupiter API error for ${contractAddress}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ No Jupiter data found for ${contractAddress}`);
      return null;
    }

    return data[0] as JupiterTokenStats;
  } catch (error) {
    console.error(`❌ Error fetching Jupiter data for ${contractAddress}:`, error);
    return null;
  }
};

// Helper function to transform Jupiter data to our format
const transformJupiterData = (jupiterData: JupiterTokenStats, tokenId: string, contractAddress: string): CreateTokenStatisticsData => {
  return {
    token_id: tokenId,
    contract_address: contractAddress,
    jupiter_id: jupiterData.id,
    name: jupiterData.name,
    symbol: jupiterData.symbol,
    icon: jupiterData.icon,
    decimals: jupiterData.decimals,
    dev: jupiterData.dev,
    circ_supply: jupiterData.circSupply,
    total_supply: jupiterData.totalSupply,
    token_program: jupiterData.tokenProgram,
    launchpad: jupiterData.launchpad,
    meta_launchpad: jupiterData.metaLaunchpad,
    partner_config: jupiterData.partnerConfig,
    holder_count: jupiterData.holderCount,
    mint_authority_disabled: jupiterData.audit.mintAuthorityDisabled,
    freeze_authority_disabled: jupiterData.audit.freezeAuthorityDisabled,
    top_holders_percentage: jupiterData.audit.topHoldersPercentage,
    dev_migrations: jupiterData.audit.devMigrations,
    organic_score: jupiterData.organicScore,
    organic_score_label: jupiterData.organicScoreLabel,
    is_verified: jupiterData.isVerified,
    tags: jupiterData.tags,
    fdv: jupiterData.fdv,
    mcap: jupiterData.mcap,
    usd_price: jupiterData.usdPrice,
    price_block_id: jupiterData.priceBlockId,
    liquidity: jupiterData.liquidity,
    ct_likes: jupiterData.ctLikes,
    smart_ct_likes: jupiterData.smartCtLikes,
    stats_5m: jupiterData.stats5m,
    stats_1h: jupiterData.stats1h,
    stats_6h: jupiterData.stats6h,
    stats_24h: jupiterData.stats24h,
    jupiter_updated_at: jupiterData.updatedAt,
  };
};

// Helper function to upsert token statistics
const upsertTokenStatistics = async (data: CreateTokenStatisticsData) => {
  try {
    const { error } = await supabase
      .from('token_statistics')
      .upsert(data, {
        onConflict: 'token_id,contract_address',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`❌ Error upserting statistics for ${data.contract_address}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Unexpected error upserting statistics for ${data.contract_address}:`, error);
    return false;
  }
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check for authorization (for cron job security)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Only check authorization if CRON_SECRET is set
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('❌ Unauthorized access attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn('⚠️ CRON_SECRET not set - skipping authorization check');
    }

    console.log('🚀 Starting token statistics update...');

    // Fetch all tokens from our database
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('id, contract_address, name, symbol')
      .order('created_at', { ascending: false });

    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch tokens', details: tokensError },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('ℹ️ No tokens found in database');
      return NextResponse.json({ 
        success: true, 
        message: 'No tokens to update',
        updated: 0,
        total: 0 
      });
    }

    console.log(`📊 Found ${tokens.length} tokens to update`);

    let successCount = 0;
    let errorCount = 0;
    const results: Array<{ contract_address: string; success: boolean; error?: string }> = [];

    // Process tokens in batches to avoid overwhelming the Jupiter API
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    console.log(`🔄 Processing ${batches.length} batches of ${batchSize} tokens each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} tokens)`);

      // Process batch with a small delay to be respectful to Jupiter API
      const batchPromises = batch.map(async (token) => {
        try {
          console.log(`🔍 Fetching data for ${token.contract_address} (${token.name})`);
          
          const jupiterData = await fetchJupiterTokenData(token.contract_address);
          
          if (!jupiterData) {
            results.push({
              contract_address: token.contract_address,
              success: false,
              error: 'No Jupiter data available'
            });
            errorCount++;
            return;
          }

          const statisticsData = transformJupiterData(jupiterData, token.id, token.contract_address);
          const success = await upsertTokenStatistics(statisticsData);

          if (success) {
            console.log(`✅ Updated statistics for ${token.contract_address}`);
            results.push({
              contract_address: token.contract_address,
              success: true
            });
            successCount++;
          } else {
            results.push({
              contract_address: token.contract_address,
              success: false,
              error: 'Failed to upsert statistics'
            });
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing ${token.contract_address}:`, error);
          results.push({
            contract_address: token.contract_address,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          errorCount++;
        }
      });

      // Wait for all promises in the batch to complete
      await Promise.all(batchPromises);

      // Add a small delay between batches to be respectful to Jupiter API
      if (batchIndex < batches.length - 1) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Token statistics update completed!`);
    console.log(`📊 Results: ${successCount} successful, ${errorCount} failed, ${tokens.length} total`);

    return NextResponse.json({
      success: true,
      message: 'Token statistics updated successfully',
      summary: {
        total: tokens.length,
        successful: successCount,
        failed: errorCount,
        success_rate: tokens.length > 0 ? ((successCount / tokens.length) * 100).toFixed(2) + '%' : '0%'
      },
      results: results.slice(0, 10), // Only return first 10 results to avoid large response
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error in token statistics update:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
