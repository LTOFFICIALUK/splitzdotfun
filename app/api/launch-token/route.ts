import { NextRequest, NextResponse } from 'next/server';
import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
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
  twitterUrl: string;
  initialBuyAmount: number;
  royaltyRecipients: Array<{
    id: string;
    type: 'wallet' | 'social';
    identifier: string;
    percentage: number;
    label: string;
    isManager: boolean;
    role: string;
  }>;
  creatorWallet: string;
  signedTransaction?: string; // Base58 encoded signed transaction
}

interface TokenLaunchResponse {
  success: boolean;
  tokenAddress: string;
  symbol: string;
  websiteUrl: string;
  message: string;
  transactionSignature?: string;
  tokenMetadata?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TokenLaunchRequest = await request.json();
    
    // Validate required fields
    if (!body.name || !body.symbol || !body.description || !body.imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, description, imageUrl' },
        { status: 400 }
      );
    }

    if (!body.creatorWallet) {
      return NextResponse.json(
        { error: 'Creator wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    try {
      new PublicKey(body.creatorWallet);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Initialize Solana connection and BagsApp SDK
    const connection = new Connection(SOLANA_RPC_URL!);
    const sdk = new BagsSDK(BAGS_API_KEY!, connection, 'processed');

    // Generate a unique token ID for the website URL
    const tokenId = generateTokenId();
    const websiteUrl = `https://splitz.fun/token/${tokenId}`;

    // Prepare BagsApp API parameters
    const launchParams = {
      imageUrl: body.imageUrl,
      name: body.name,
      symbol: body.symbol,
      description: body.description,
      twitterUrl: body.twitterUrl,
      websiteUrl: websiteUrl,
      initialBuyAmountLamports: Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL),
      // Hardcode X receiver to @splitzdotfun with 100%
      xReceiver: '@splitzdotfun',
      xReceiverPercentage: 100
    };

    console.log('🚀 Launching token with BagsApp API:', {
      name: launchParams.name,
      symbol: launchParams.symbol,
      websiteUrl: launchParams.websiteUrl,
      xReceiver: launchParams.xReceiver,
      xReceiverPercentage: launchParams.xReceiverPercentage,
      creatorWallet: body.creatorWallet
    });

    try {
      // Create keypair from user's wallet address (we'll need private key from frontend)
      // For now, we'll use the BagsApp API directly
      
      console.log('📝 Creating token info and metadata...');

      // Fetch image url to file like object
      const imageBlob = await fetch(body.imageUrl).then(res => res.blob());

      // Create token info and metadata
      const tokenInfoResponse = await sdk.tokenLaunch.createTokenInfoAndMetadata({
        image: imageBlob,
        name: body.name,
        description: body.description,
        symbol: body.symbol?.toUpperCase()?.replace("$", ""),
        twitter: body.twitterUrl,
        website: websiteUrl,
      });

      console.log('✨ Successfully created token info and metadata!');
      console.log('🪙 Token mint:', tokenInfoResponse.tokenMint);

      const response: TokenLaunchResponse = {
        success: true,
        tokenAddress: tokenInfoResponse.tokenMint,
        symbol: body.symbol,
        websiteUrl: websiteUrl,
        message: 'Token metadata created successfully! Ready for launch.',
        tokenMetadata: tokenInfoResponse.tokenMetadata
      };

      console.log('✅ Token metadata created successfully:', response);
      return NextResponse.json(response);

    } catch (apiError) {
      console.error('❌ BagsApp API error:', apiError);
      throw new Error(`BagsApp API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Token launch error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to launch token',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to generate a unique token ID
function generateTokenId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to generate a mock token address for demo purposes
function generateMockTokenAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
