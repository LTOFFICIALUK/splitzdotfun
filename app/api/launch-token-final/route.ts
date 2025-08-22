import { NextRequest, NextResponse } from 'next/server';

interface TokenLaunchRequest {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitterUrl?: string;
  initialBuyAmount: number;
  creatorWallet: string;
}

interface TokenLaunchResponse {
  success: boolean;
  tokenMint: string;
  tokenMetadata: string;
  message: string;
  error?: string;
  transactions?: {
    configTransaction?: string; // Base58 encoded
    launchTransaction?: string; // Base58 encoded
  };
  needsConfigTransaction?: boolean;
}

// Bags API configuration
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const BAGS_API_BASE_URL = 'https://public-api-v2.bags.fm/api/v1';

if (!BAGS_API_KEY) {
  console.error('❌ API: BAGS_API_KEY environment variable is missing');
  throw new Error('BAGS_API_KEY environment variable is required');
}

// Type assertion to ensure API key is available
const API_KEY = BAGS_API_KEY as string;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 API: Starting Bags token launch with shared fees...');
    
    const body: TokenLaunchRequest = await request.json();
    console.log('📥 API: Request body received:', { 
      name: body.name, 
      symbol: body.symbol, 
      hasImage: !!body.imageUrl,
      creatorWallet: body.creatorWallet 
    });
    
    // Validate required fields
    if (!body.name || !body.symbol || !body.description || !body.imageUrl || !body.creatorWallet) {
      console.log('❌ API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, description, imageUrl, creatorWallet' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Bags token launch process...');
    console.log(`📝 Token: ${body.name} (${body.symbol})`);
    console.log(`💰 Initial buy: ${body.initialBuyAmount} SOL`);
    console.log(`👤 Creator: ${body.creatorWallet}`);
    console.log(`🏢 Platform: @splitzdotfun (100% fees)`);

    // Step 1: Create token info and metadata
    console.log('📝 Step 1: Creating token info and metadata...');
    
    let tokenInfo: any;
    try {
      // Fetch image from URL to blob
      console.log('🖼️ API: Fetching image from URL...');
      const imageResponse = await fetch(body.imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      const imageBlob = await imageResponse.blob();
      console.log('✅ API: Image fetched successfully, size:', imageBlob.size);

      // Create FormData for the image
      const formData = new FormData();
      formData.append('image', imageBlob, 'token-image.png');
      formData.append('name', body.name);
      formData.append('symbol', body.symbol.toUpperCase().replace('$', ''));
      formData.append('description', body.description);
      if (body.twitterUrl) {
        formData.append('twitter', body.twitterUrl);
      }
      formData.append('website', `https://splitz.fun/token/placeholder`);

      // Create token info and metadata using Bags API
      console.log('🔧 API: Creating token info and metadata...');
      const tokenResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/create-token-info`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
        },
        body: formData
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token creation failed: ${tokenResponse.status} ${errorText}`);
      }

      tokenInfo = await tokenResponse.json();
      console.log('✅ Token info and metadata created successfully!');
      console.log(`🪙 Token mint: ${tokenInfo.response.tokenMint}`);
      console.log(`📄 Metadata URI: ${tokenInfo.response.tokenMetadata}`);
    } catch (error) {
      console.error('❌ API: Error in Step 1 (token info creation):', error);
      throw error;
    }

    // Step 2: Get platform fee wallet from Twitter username
    console.log('🔍 Step 2: Getting platform fee wallet from @splitzdotfun...');
    
    let platformWallet: string;
    try {
      console.log('🔧 API: Getting fee wallet for @splitzdotfun...');
      const feeWalletResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/fee-share/wallet/twitter?twitterUsername=splitzdotfun`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
        }
      });

      if (!feeWalletResponse.ok) {
        const errorText = await feeWalletResponse.text();
        throw new Error(`Fee wallet lookup failed: ${feeWalletResponse.status} ${errorText}`);
      }

      const feeWalletData = await feeWalletResponse.json();
      platformWallet = feeWalletData.response;
      
      console.log(`✅ Platform fee wallet: ${platformWallet}`);
    } catch (error) {
      console.error('❌ API: Error in Step 2 (fee wallet lookup):', error);
      throw error;
    }

    // Step 3: Create fee share configuration
    console.log('⚙️ Step 3: Creating fee share configuration...');
    
    let feeShareConfig: any;
    try {
      const initialBuyLamports = Math.floor(body.initialBuyAmount * 1e9); // Convert SOL to lamports
      
      console.log('🔧 API: Creating fee share config...');
      const feeShareResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/fee-share/create-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          walletA: body.creatorWallet,        // Creator wallet
          walletB: platformWallet,            // Platform wallet
          walletABps: 0,                      // 0% for creator
          walletBBps: 10000,                  // 100% for platform
          payer: body.creatorWallet,          // Creator pays for transaction
          baseMint: tokenInfo.response.tokenMint,
          quoteMint: 'So11111111111111111111111111111111111111112', // wSOL mint
          initialBuyLamports: initialBuyLamports
        })
      });

      if (!feeShareResponse.ok) {
        const errorText = await feeShareResponse.text();
        throw new Error(`Fee share config failed: ${feeShareResponse.status} ${errorText}`);
      }

      feeShareConfig = await feeShareResponse.json();
      console.log(`✅ Fee share config created with key: ${feeShareConfig.response.configKey}`);
    } catch (error) {
      console.error('❌ API: Error in Step 3 (fee share config):', error);
      throw error;
    }

    // Step 4: Create launch transaction
    console.log('🎯 Step 4: Creating launch transaction...');
    
    let launchTransaction: any;
    try {
      const initialBuyLamports = Math.floor(body.initialBuyAmount * 1e9); // Convert SOL to lamports
      
      console.log('🔧 API: Creating launch transaction...');
      const launchResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/create-launch-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          ipfs: tokenInfo.response.tokenMetadata,
          tokenMint: tokenInfo.response.tokenMint,
          wallet: body.creatorWallet,
          initialBuyLamports: initialBuyLamports,
          configKey: feeShareConfig.response.configKey
        })
      });

      if (!launchResponse.ok) {
        const errorText = await launchResponse.text();
        throw new Error(`Launch transaction failed: ${launchResponse.status} ${errorText}`);
      }

      launchTransaction = await launchResponse.json();
      console.log('✅ Launch transaction created successfully!');
    } catch (error) {
      console.error('❌ API: Error in Step 4 (launch transaction):', error);
      throw error;
    }

    // Step 5: Return the transactions for frontend signing
    const response: TokenLaunchResponse = {
      success: true,
      tokenMint: tokenInfo.response.tokenMint,
      tokenMetadata: tokenInfo.response.tokenMetadata,
      message: 'Token launch setup completed successfully! Ready for wallet signing.',
      transactions: {
        configTransaction: feeShareConfig.response.tx,
        launchTransaction: launchTransaction.response,
      },
      needsConfigTransaction: true,
    };

    console.log('🎉 Token launch setup completed!');
    console.log(`🪙 Token mint: ${tokenInfo.response.tokenMint}`);
    console.log(`💰 Fee share: 0% creator, 100% platform (@splitzdotfun)`);
    console.log(`🔑 Config key: ${feeShareConfig.response.configKey}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Token launch error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to launch token',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
