import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExplorePageToken, JupiterTokenData, CreateExplorePageTokenData } from '@/types/explore-page';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Jupiter API endpoints
const JUPITER_SEARCH_API = 'https://lite-api.jup.ag/tokens/v2/search';

interface JupiterSearchResponse {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  mcap: number;
  usdPrice: number;
  stats24h: {
    priceChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
  };
  liquidity: number;
  updatedAt: string;
}

// Fetch token data from Jupiter API
const fetchJupiterTokenData = async (contractAddress: string): Promise<JupiterTokenData | null> => {
  try {
    console.log(`Fetching Jupiter data for ${contractAddress}`);
    
    // Fetch token data using the search endpoint
    const searchResponse = await fetch(`${JUPITER_SEARCH_API}?query=${contractAddress}`);
    if (!searchResponse.ok) {
      console.warn(`Failed to fetch Jupiter data for ${contractAddress}:`, searchResponse.status);
      return null;
    }

    const searchData: JupiterSearchResponse[] = await searchResponse.json();
    const tokenInfo = searchData?.find(token => token.id === contractAddress);

    if (!tokenInfo) {
      console.warn(`No token data found for ${contractAddress}`);
      return null;
    }

    console.log(`Found token data for ${contractAddress}:`, tokenInfo);

    // Use actual data from Jupiter
    const price = tokenInfo.usdPrice || 0.01;
    const marketCap = tokenInfo.mcap || (price * 1000000);
    const volume24h = (tokenInfo.stats24h?.buyVolume || 0) + (tokenInfo.stats24h?.sellVolume || 0);
    const priceChange24h = tokenInfo.stats24h?.priceChange || 0;

    return {
      address: contractAddress,
      name: tokenInfo.name || 'Unknown Token',
      symbol: tokenInfo.symbol || 'UNKNOWN',
      image: tokenInfo.icon || '',
      marketCap,
      volume24h,
      price,
      priceChange24h
    };
  } catch (error) {
    console.error(`Error fetching Jupiter data for ${contractAddress}:`, error);
    return null;
  }
};

// Determine token category based on creation date and activity
const determineTokenCategory = (createdAt: string, marketCap: number | null): 'new' | '24h' | 'older' => {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCreation <= 1) {
    return 'new';
  } else if (daysSinceCreation <= 7 && marketCap && marketCap > 10000) {
    return '24h';
  } else {
    return 'older';
  }
};

// Generate Solscan link
const generateSolscanLink = (contractAddress: string): string => {
  return `https://solscan.io/token/${contractAddress}`;
};

// Update explore page data
const updateExplorePageData = async (): Promise<void> => {
  try {
    console.log('Starting explore page data update...');

    // Fetch all tokens from our database
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('id, contract_address, name, symbol, social_link, created_at')
      .order('created_at', { ascending: false });

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('No tokens found in database');
      return;
    }

    console.log(`Found ${tokens.length} tokens to process`);
    console.log('Token addresses:', tokens.map(t => t.contract_address));

    // Process tokens in batches to avoid rate limiting
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

          for (const batch of batches) {
        const updatePromises = batch.map(async (token) => {
          try {
            console.log(`Processing token: ${token.contract_address}`);
            // Fetch Jupiter data
            const jupiterData = await fetchJupiterTokenData(token.contract_address);
            
            if (!jupiterData) {
              console.warn(`No Jupiter data for ${token.contract_address}, using fallback data`);
              // Use fallback data from our database
              const fallbackData: CreateExplorePageTokenData = {
                token_id: token.id,
                contract_address: token.contract_address,
                name: token.name,
                symbol: token.symbol,
                social_link: token.social_link,
                solscan_link: generateSolscanLink(token.contract_address),
                category: determineTokenCategory(token.created_at, null)
              };

              console.log(`Inserting fallback data for ${token.contract_address}`);
              // Upsert to database
              const { error: upsertError } = await supabase
                .from('explore_page')
                .upsert(fallbackData, { onConflict: 'token_id' });

              if (upsertError) {
                console.error(`Failed to upsert fallback data for ${token.contract_address}:`, upsertError);
              } else {
                console.log(`Successfully inserted fallback data for ${token.contract_address}`);
              }

              return;
            }

          // Prepare data for database
          const exploreData: CreateExplorePageTokenData = {
            token_id: token.id,
            contract_address: token.contract_address,
            name: jupiterData.name,
            symbol: jupiterData.symbol,
            image_url: jupiterData.image || undefined,
            market_cap: jupiterData.marketCap,
            volume_24h: jupiterData.volume24h,
            price: jupiterData.price,
            price_change_24h: jupiterData.priceChange24h,
            social_link: token.social_link,
            solscan_link: generateSolscanLink(token.contract_address),
            category: determineTokenCategory(token.created_at, jupiterData.marketCap)
          };

          // Insert to database (delete existing first to avoid conflicts)
          const { error: deleteError } = await supabase
            .from('explore_page')
            .delete()
            .eq('token_id', token.id);

          if (deleteError) {
            console.error(`Failed to delete existing data for ${token.contract_address}:`, deleteError);
          }

          const { error: insertError } = await supabase
            .from('explore_page')
            .insert(exploreData);

          if (insertError) {
            console.error(`Failed to insert data for ${token.contract_address}:`, insertError);
          } else {
            console.log(`Successfully inserted data for ${token.contract_address}`);
          }

        } catch (error) {
          console.error(`Error processing token ${token.contract_address}:`, error);
        }
      });

      // Wait for batch to complete
      await Promise.all(updatePromises);
      
      // Add delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Explore page data update completed successfully');

  } catch (error) {
    console.error('Error updating explore page data:', error);
    throw error;
  }
};

// API route handler
export async function POST(request: NextRequest) {
  try {
    // Check for authorization (you might want to add proper auth here)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    // Add your token validation logic here if needed

    // Update explore page data
    await updateExplorePageData();

    return NextResponse.json({ 
      success: true, 
      message: 'Explore page data updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in update-explore-data API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// GET endpoint to manually trigger update (for testing)
export async function GET() {
  try {
    await updateExplorePageData();
    return NextResponse.json({ 
      success: true, 
      message: 'Explore page data updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in update-explore-data GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
