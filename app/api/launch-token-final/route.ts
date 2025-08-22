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
const BYPASS_FEE_SHARE = (process.env.BAGS_BYPASS_FEE_SHARE || 'true') === 'true';

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
      const descriptionWithHandle = `${body.description}\nCreator: @launchonsplitz`;
      formData.append('description', descriptionWithHandle);
      // Intentionally do not set twitter link; handle is embedded in description
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

    // Step 2: Either create fee-share config (default) or bypass if env flag set
    let configKey: string | undefined;
    let configTransactionBase58: string | undefined;
    
    if (BYPASS_FEE_SHARE) {
      console.log('⏭️ Bypassing shared fees due to BYPASS_FEE_SHARE=true. Proceeding to launch tx.');
    } else {
      console.log('⚙️ Step 2-4: Creating fee-share configuration via SDK...');

      const creatorBps = 1000; // 10%
      const platformBps = 10000 - creatorBps; // 90%
      
      try {
        const connection = new Connection(SOLANA_RPC_URL);
        const sdk = new BagsSDK(API_KEY, connection, 'processed');

        const creatorPublicKey = new PublicKey(body.creatorWallet);
        const baseMint = new PublicKey(tokenInfo.response.tokenMint);
        const wsolMint = new PublicKey('So11111111111111111111111111111111111111112');

        // Set fee claimer wallet (walletB) to the platform wallet explicitly
        const feeShareWallet = new PublicKey('4rQSE2L8SmE6Doe3FggaDnUvaXeySfvSDtMx1xpPHN2a');
        console.log('✅ SDK: Platform fee share wallet (walletB):', feeShareWallet.toString());

        console.log(`🧮 SDK: Using fee split -> creator: ${creatorBps} bps, platform: ${platformBps} bps`);

        console.log('🔧 SDK: Creating fee-share config with:', {
          baseMint: baseMint.toString(),
          quoteMint: wsolMint.toString(),
          payer: creatorPublicKey.toString(),
          users: [
            { wallet: creatorPublicKey.toString(), bps: creatorBps },
            { wallet: feeShareWallet.toString(), bps: platformBps },
          ],
        });

        const feeShareConfig = await sdk.config.createFeeShareConfig({
          users: [
            { wallet: creatorPublicKey, bps: creatorBps },
            { wallet: feeShareWallet, bps: platformBps },
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
        // Strict compliance: surface error and stop here
        throw error;
      }

      // Step 3: If config creation transaction is required, return it first and defer launch creation
      if (configTransactionBase58 && !configKey) {
        const response: TokenLaunchResponse = {
          success: true,
          tokenMint: tokenInfo.response.tokenMint,
          tokenMetadata: tokenInfo.response.tokenMetadata,
          message: 'Configuration transaction created. Sign this first, then request the launch transaction.',
          transactions: {
            configTransaction: configTransactionBase58,
          },
          needsConfigTransaction: true,
        };

        console.log('🔁 Returning config transaction only; awaiting client to request launch tx');
        return NextResponse.json(response);
      }
    }
    // Step 3b: Create launch transaction now
    console.log('🎯 Creating launch transaction via SDK...');
    let launchTransactionBase58: string;
    try {
      const connection = new Connection(SOLANA_RPC_URL);
      const sdk = new BagsSDK(API_KEY, connection, 'processed');

      const creatorPublicKey = new PublicKey(body.creatorWallet);
      const baseMint = new PublicKey(tokenInfo.response.tokenMint);
      const initialBuyLamports = Math.floor(body.initialBuyAmount * 1e9);

      const launchArgs: any = {
        metadataUrl: tokenInfo.response.tokenMetadata,
        tokenMint: baseMint,
        launchWallet: creatorPublicKey,
        initialBuyLamports,
      };
      if (!BYPASS_FEE_SHARE && configKey) {
        launchArgs.configKey = new PublicKey(configKey);
      }
      const launchTx = await sdk.tokenLaunch.createLaunchTransaction(launchArgs);

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
      message: BYPASS_FEE_SHARE ? 'Token launch setup completed (no shared fees).' : 'Token launch setup completed successfully! Ready for wallet signing.',
      transactions: {
        configTransaction: BYPASS_FEE_SHARE ? undefined : configTransactionBase58,
        launchTransaction: launchTransactionBase58,
      },
      needsConfigTransaction: BYPASS_FEE_SHARE ? false : false,
    };

    console.log('🎉 Token launch setup completed!');
    console.log(`🪙 Token mint: ${tokenInfo.response.tokenMint}`);
    if (BYPASS_FEE_SHARE) {
      console.log('💰 Shared fees bypassed (env).');
    } else {
      console.log(`💰 Fee share: 10% creator, 90% platform (@splitzdotfun)`);
      console.log(`🔑 Config key: ${configKey}`);
    }

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
