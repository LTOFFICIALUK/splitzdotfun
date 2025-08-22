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
  needsSigning?: boolean;
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

    // We'll create the metadata first to get the actual contract address
    // The website URL will be updated with the real contract address after metadata creation
    const placeholderWebsiteUrl = `https://splitz.fun/token/placeholder`;

    // Prepare BagsApp API parameters for shared fees
    const launchParams = {
      imageUrl: body.imageUrl,
      name: body.name,
      symbol: body.symbol,
      description: body.description,
      twitterUrl: body.twitterUrl,
      websiteUrl: placeholderWebsiteUrl,
      initialBuyAmountLamports: Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL),
      // Shared fees configuration - 100% to platform
      feeClaimerTwitterUsername: 'splitzdotfun', // Platform custodial wallet
      creatorFeeBps: 0, // 0% for creator
      feeClaimerFeeBps: 10000, // 100% for fee claimer (splitzdotfun)
      telegramUrl: body.twitterUrl, // Use Twitter URL as Telegram for now
      creatorTwitterUsername: 'launchonsplitz' // Our platform creator account
    };

    console.log('🚀 Launching token with BagsApp Shared Fees API:', {
      name: launchParams.name,
      symbol: launchParams.symbol,
      websiteUrl: launchParams.websiteUrl,
      feeClaimerTwitterUsername: launchParams.feeClaimerTwitterUsername,
      creatorFeeBps: launchParams.creatorFeeBps,
      feeClaimerFeeBps: launchParams.feeClaimerFeeBps,
      creatorTwitterUsername: launchParams.creatorTwitterUsername,
      creatorWallet: body.creatorWallet
    });

    try {
      // We need the user's private key to sign transactions
      // For now, we'll create the metadata and return the data needed for frontend signing
      
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
        website: placeholderWebsiteUrl,
      });

      console.log('✨ Successfully created token info and metadata!');
      console.log('🪙 Token mint:', tokenInfoResponse.tokenMint);

      // Use the actual token address for the URL
      const actualWebsiteUrl = `https://splitz.fun/token/${tokenInfoResponse.tokenMint}`;
      
      const response: TokenLaunchResponse = {
        success: true,
        tokenAddress: tokenInfoResponse.tokenMint,
        symbol: body.symbol,
        websiteUrl: actualWebsiteUrl,
        message: 'Token metadata created! Now we need to launch the token with shared fees using wallet signing.',
        tokenMetadata: tokenInfoResponse.tokenMetadata,
        needsSigning: true
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

// Note: Contract address (CA) is generated by the BagsApp API and used for all token URLs
