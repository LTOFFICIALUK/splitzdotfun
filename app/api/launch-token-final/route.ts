import { NextRequest, NextResponse } from 'next/server';

// Add error handling around imports
let BagsSDK: any;
let Connection: any;
let LAMPORTS_PER_SOL: any;
let PublicKey: any;
let VersionedTransaction: any;
let bs58: any;

try {
  BagsSDK = require('@bagsfm/bags-sdk').BagsSDK;
  const web3 = require('@solana/web3.js');
  Connection = web3.Connection;
  LAMPORTS_PER_SOL = web3.LAMPORTS_PER_SOL;
  PublicKey = web3.PublicKey;
  VersionedTransaction = web3.VersionedTransaction;
  bs58 = require('bs58');
} catch (importError) {
  console.error('❌ API: Failed to import required modules:', importError);
}

// Initialize BagsApp API configuration
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

if (!BAGS_API_KEY) {
  console.error('❌ API: BAGS_API_KEY environment variable is missing');
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
    console.log('🔧 API: Starting launch-token-final request...');
    
    // Check if imports were successful
    if (!BagsSDK || !Connection || !LAMPORTS_PER_SOL || !PublicKey || !VersionedTransaction || !bs58) {
      throw new Error('Required modules failed to import');
    }
    
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

    console.log('🔧 API: Initializing SDK...');
    
    // Initialize Solana connection and BagsApp SDK
    const connection = new Connection(SOLANA_RPC_URL!);
    const sdk = new BagsSDK(BAGS_API_KEY!, connection, 'processed');

    const creatorPublicKey = new PublicKey(body.creatorWallet);
    const initialBuyLamports = Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL);

    console.log('🚀 Starting complete token launch process...');
    console.log(`📝 Token: ${body.name} (${body.symbol})`);
    console.log(`💰 Initial buy: ${body.initialBuyAmount} SOL (${initialBuyLamports} lamports)`);
    console.log(`👤 Creator: ${body.creatorWallet}`);

    // Declare variables that will be used throughout
    let tokenInfo: any;
    let feeShareWallet: any;
    let feeShareConfig: any;
    let launchTransaction: any;

    // Step 1: Create token info and metadata
    console.log('📝 Step 1: Creating token info and metadata...');
    
    try {
      // Fetch image from URL to blob
      console.log('🖼️ API: Fetching image from URL...');
      const imageResponse = await fetch(body.imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      const imageBlob = await imageResponse.blob();
      console.log('✅ API: Image fetched successfully, size:', imageBlob.size);

      // Create token info and metadata using Bags SDK
      console.log('🔧 API: Creating token info and metadata...');
      tokenInfo = await sdk.tokenLaunch.createTokenInfoAndMetadata({
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
    } catch (error) {
      console.error('❌ API: Error in Step 1 (token info creation):', error);
      throw error;
    }

    // Step 2: Get fee share wallet for platform
    console.log('🔍 Step 2: Getting platform fee share wallet...');
    
    try {
      const platformTwitterUsername = 'splitzdotfun';
      console.log('🔧 API: Getting fee share wallet for:', platformTwitterUsername);
      feeShareWallet = await sdk.state.getLaunchWalletForTwitterUsername(platformTwitterUsername);
      
      console.log(`✅ Platform fee wallet: ${feeShareWallet.toString()}`);
    } catch (error) {
      console.error('❌ API: Error in Step 2 (fee share wallet):', error);
      throw error;
    }

    // Step 3: Create fee share configuration
    console.log('⚙️ Step 3: Creating fee share configuration...');
    
    try {
      const baseMint = new PublicKey(tokenInfo.tokenMint);
      const wsolMint = new PublicKey('So11111111111111111111111111111111111111112'); // wSOL mint

      console.log('🔧 API: Creating fee share config...');
      feeShareConfig = await sdk.config.createFeeShareConfig({
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
    } catch (error) {
      console.error('❌ API: Error in Step 3 (fee share config):', error);
      throw error;
    }

    // Step 4: Create launch transaction
    console.log('🎯 Step 4: Creating launch transaction...');
    
    try {
      const baseMint = new PublicKey(tokenInfo.tokenMint);
      launchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
        metadataUrl: tokenInfo.tokenMetadata,
        tokenMint: baseMint,
        launchWallet: creatorPublicKey,
        initialBuyLamports: initialBuyLamports,
        configKey: feeShareConfig.configKey,
      });

      console.log('✅ Launch transaction created successfully!');
    } catch (error) {
      console.error('❌ API: Error in Step 4 (launch transaction):', error);
      throw error;
    }

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
