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
  needsSigning?: boolean;
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

    console.log('🚀 Starting token launch process...');
    console.log(`📝 Token: ${body.name} (${body.symbol})`);
    console.log(`💰 Initial buy: ${body.initialBuyAmount} SOL`);
    console.log(`👤 Creator: ${body.creatorWallet}`);

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

      // Return the token info for frontend to handle transaction signing
      const response: TokenLaunchResponse = {
        success: true,
        tokenMint: tokenInfo.tokenMint,
        tokenMetadata: tokenInfo.tokenMetadata,
        message: 'Token metadata created successfully! Now we need to launch the token with shared fees using wallet signing.',
        needsSigning: true
      };

      console.log('🎉 Token metadata creation completed!');
      console.log(`🪙 Token mint: ${tokenInfo.tokenMint}`);
      console.log(`📄 Metadata URI: ${tokenInfo.tokenMetadata}`);
      console.log('💰 Next step: Frontend will handle fee-share config and launch transaction signing');

      return NextResponse.json(response);

    } catch (error) {
      console.error('❌ API: Error in token info creation:', error);
      throw error;
    }

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
