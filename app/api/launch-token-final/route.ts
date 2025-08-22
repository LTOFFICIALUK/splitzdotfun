import { NextRequest, NextResponse } from 'next/server';
import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

// Initialize BagsApp API configuration
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

if (!BAGS_API_KEY) {
  throw new Error('BAGS_API_KEY environment variable is required');
}

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TokenLaunchRequest = await request.json();
    
    // Validate required fields
    if (!body.name || !body.symbol || !body.description || !body.imageUrl || !body.creatorWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, description, imageUrl, creatorWallet' },
        { status: 400 }
      );
    }

    // Initialize Solana connection and BagsApp SDK
    const connection = new Connection(SOLANA_RPC_URL!);
    const sdk = new BagsSDK(BAGS_API_KEY!, connection, 'processed');

    const creatorPublicKey = new PublicKey(body.creatorWallet);
    const initialBuyLamports = Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL);

    console.log('🚀 Starting complete token launch process...');
    console.log(`📝 Token: ${body.name} (${body.symbol})`);
    console.log(`💰 Initial buy: ${body.initialBuyAmount} SOL (${initialBuyLamports} lamports)`);
    console.log(`👤 Creator: ${body.creatorWallet}`);

    // Step 1: Create token info and metadata
    console.log('📝 Step 1: Creating token info and metadata...');
    
    // Fetch image from URL to blob
    const imageResponse = await fetch(body.imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image from URL');
    }
    const imageBlob = await imageResponse.blob();

    // Create token info and metadata using Bags SDK
    const tokenInfo = await sdk.tokenLaunch.createTokenInfoAndMetadata({
      image: imageBlob,
      name: body.name,
      symbol: body.symbol.toUpperCase().replace('$', ''),
      description: body.description,
      twitter: body.twitterUrl || undefined,
      website: `https://splitz.fun/token/placeholder`, // Will be updated after mint creation
    });

    console.log('✅ Token info and metadata created successfully!');
    console.log(`🪙 Token mint: ${tokenInfo.tokenMint}`);
    console.log(`📄 Metadata URI: ${tokenInfo.tokenMetadata}`);

    // Step 2: Get fee share wallet for platform
    console.log('🔍 Step 2: Getting platform fee share wallet...');
    
    const platformTwitterUsername = 'splitzdotfun';
    const feeShareWallet = await sdk.state.getLaunchWalletForTwitterUsername(platformTwitterUsername);
    
    console.log(`✅ Platform fee wallet: ${feeShareWallet.toString()}`);

    // Step 3: Create fee share configuration
    console.log('⚙️ Step 3: Creating fee share configuration...');
    
    const baseMint = new PublicKey(tokenInfo.tokenMint);
    const wsolMint = new PublicKey('So11111111111111111111111111111111111111112'); // wSOL mint

    const feeShareConfig = await sdk.config.createFeeShareConfig({
      users: [
        {
          wallet: creatorPublicKey,
          bps: 0, // 0% for creator
        },
        {
          wallet: feeShareWallet,
          bps: 10000, // 100% for platform
        },
      ],
      payer: creatorPublicKey,
      baseMint: baseMint,
      quoteMint: wsolMint,
    });

    console.log(`✅ Fee share config created with key: ${feeShareConfig.configKey.toString()}`);

    // Step 4: Create launch transaction
    console.log('🎯 Step 4: Creating launch transaction...');
    
    const launchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl: tokenInfo.tokenMetadata,
      tokenMint: baseMint,
      launchWallet: creatorPublicKey,
      initialBuyLamports: initialBuyLamports,
      configKey: feeShareConfig.configKey,
    });

    console.log('✅ Launch transaction created successfully!');

    // Step 5: Return the transactions for frontend signing
    const response: TokenLaunchResponse = {
      success: true,
      tokenMint: tokenInfo.tokenMint,
      tokenMetadata: tokenInfo.tokenMetadata,
      message: 'Token launch setup completed successfully! Ready for wallet signing.',
      transactions: {
        configTransaction: feeShareConfig.transaction ? bs58.encode(feeShareConfig.transaction.serialize()) : undefined,
        launchTransaction: bs58.encode(launchTransaction.serialize()),
      },
      needsConfigTransaction: !!feeShareConfig.transaction,
    };

    console.log('🎉 Token launch setup completed!');
    console.log(`🪙 Token mint: ${tokenInfo.tokenMint}`);
    console.log(`💰 Fee share: 0% creator, 100% platform`);
    console.log(`🔑 Config key: ${feeShareConfig.configKey.toString()}`);
    console.log(`📝 Needs config transaction: ${!!feeShareConfig.transaction}`);

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
