import { NextRequest, NextResponse } from 'next/server';
import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

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
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

if (!BAGS_API_KEY) {
  console.error('❌ API: BAGS_API_KEY environment variable is missing');
  throw new Error('BAGS_API_KEY environment variable is required');
}

// Type assertion to ensure API key is available
const API_KEY = BAGS_API_KEY as string;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 API: Starting Bags token launch...');
    console.log('🔑 API: BAGS_API_KEY present:', !!BAGS_API_KEY);
    console.log('🔗 API: BAGS_API_BASE_URL:', BAGS_API_BASE_URL);
    
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
    console.log(`👤 Creator: @launchonsplitz (${body.creatorWallet})`);

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

    // Step 2: Get creator's fee wallet from X username
    // Step 2-4: Create fee-share config using Bags SDK (more reliable than REST)
    console.log('⚙️ Step 2-4: Creating fee-share configuration via SDK...');

    let configKey: string;
    let configTransactionBase58: string | undefined;
    try {
      const connection = new Connection(SOLANA_RPC_URL);
      const sdk = new BagsSDK(API_KEY, connection, 'processed');

      const creatorPublicKey = new PublicKey(body.creatorWallet);
      const baseMint = new PublicKey(tokenInfo.response.tokenMint);
      const wsolMint = new PublicKey('So11111111111111111111111111111111111111112');

      // Resolve platform wallet by Twitter username (fee claimer)
      const platformTwitter = 'splitzdotfun';
      const feeShareWallet = await sdk.state.getLaunchWalletForTwitterUsername(platformTwitter);
      console.log('✅ SDK: Platform fee share wallet:', feeShareWallet.toString());

      // Resolve creator distribution wallet by Twitter username if provided
      const extractTwitterHandle = (urlOrHandle?: string) => {
        if (!urlOrHandle) return undefined;
        const input = urlOrHandle.trim();
        if (!input) return undefined;
        // Accept '@handle', 'handle', 'https://twitter.com/handle', 'https://x.com/handle'
        const atStripped = input.startsWith('@') ? input.slice(1) : input;
        try {
          const url = new URL(atStripped.startsWith('http') ? atStripped : `https://${atStripped}`);
          const host = url.hostname.replace('www.', '');
          if (host === 'twitter.com' || host === 'x.com') {
            const parts = url.pathname.split('/').filter(Boolean);
            return parts[0]?.replace('@', '');
          }
        } catch {}
        return atStripped.replace(/^[^A-Za-z0-9_]+/, '');
      };

      const creatorHandle = extractTwitterHandle(body.twitterUrl);
      let creatorDistributionWallet: PublicKey | null = null;
      if (creatorHandle) {
        try {
          creatorDistributionWallet = await sdk.state.getLaunchWalletForTwitterUsername(creatorHandle);
          console.log(`✅ SDK: Creator fee share wallet (@${creatorHandle}):`, creatorDistributionWallet.toString());
        } catch (e) {
          console.warn(`⚠️ SDK: Could not resolve creator wallet from @${creatorHandle}. Falling back to connected wallet.`);
        }
      }

      const feeShareConfig = await sdk.config.createFeeShareConfig({
        users: [
          { wallet: creatorDistributionWallet ?? creatorPublicKey, bps: 0 },
          { wallet: feeShareWallet, bps: 10000 },
        ],
        payer: creatorPublicKey,
        baseMint,
        quoteMint: wsolMint,
      });

      configKey = feeShareConfig.configKey.toString();
      console.log('✅ SDK: Fee-share config key:', configKey);

      if (feeShareConfig.transaction) {
        configTransactionBase58 = bs58.encode(feeShareConfig.transaction.serialize());
        console.log('🔧 SDK: Config creation transaction needs signing');
      } else {
        console.log('♻️ SDK: Fee-share configuration already exists');
      }
    } catch (error) {
      console.error('❌ SDK: Error creating fee-share config:', error);
      throw error;
    }

    // Step 5: Create launch transaction via SDK
    console.log('🎯 Step 5: Creating launch transaction via SDK...');
    let launchTransactionBase58: string;
    try {
      const connection = new Connection(SOLANA_RPC_URL);
      const sdk = new BagsSDK(API_KEY, connection, 'processed');

      const creatorPublicKey = new PublicKey(body.creatorWallet);
      const baseMint = new PublicKey(tokenInfo.response.tokenMint);
      const initialBuyLamports = Math.floor(body.initialBuyAmount * 1e9);

      const launchTx = await sdk.tokenLaunch.createLaunchTransaction({
        metadataUrl: tokenInfo.response.tokenMetadata,
        tokenMint: baseMint,
        launchWallet: creatorPublicKey,
        initialBuyLamports,
        configKey: new PublicKey(configKey),
      });

      launchTransactionBase58 = bs58.encode(launchTx.serialize());
      console.log('✅ SDK: Launch transaction created');
    } catch (error) {
      console.error('❌ SDK: Error creating launch transaction:', error);
      throw error;
    }

    // Step 6: Return the transactions for frontend signing
    const response: TokenLaunchResponse = {
      success: true,
      tokenMint: tokenInfo.response.tokenMint,
      tokenMetadata: tokenInfo.response.tokenMetadata,
      message: 'Token launch setup completed successfully! Ready for wallet signing.',
      transactions: {
        configTransaction: configTransactionBase58,
        launchTransaction: launchTransactionBase58,
      },
      needsConfigTransaction: !!configTransactionBase58,
    };

    console.log('🎉 Token launch setup completed!');
    console.log(`🪙 Token mint: ${tokenInfo.response.tokenMint}`);
    console.log(`💰 Fee share: 0% creator, 100% platform (@splitzdotfun)`);
    console.log(`🔑 Config key: ${configKey}`);

    return NextResponse.json(response);

  } catch (error) {
    // Improve surfacing of nested error messages
    const message = error instanceof Error ? (error.message || 'Internal server error') : 'Internal server error';
    let details: any = undefined;
    try {
      details = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch {}
    console.error('❌ Token launch error:', message, details ?? '');

    return NextResponse.json(
      { 
        success: false,
        error: message,
        details: process.env.NODE_ENV === 'development' ? (details ?? String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
