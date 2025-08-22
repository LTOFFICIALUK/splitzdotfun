import { NextRequest, NextResponse } from 'next/server';
import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Initialize BagsApp API configuration
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

if (!BAGS_API_KEY) {
  throw new Error('BAGS_API_KEY environment variable is required');
}

interface CreateLaunchTransactionRequest {
  tokenMint: string;
  tokenMetadata: string;
  initialBuyAmount: number;
  creatorWallet: string;
  symbol?: string;
  name?: string;
  twitterUrl?: string;
}

interface CreateLaunchTransactionResponse {
  success: boolean;
  transaction: any; // Serialized transaction
  message: string;
  isConfigTransaction?: boolean;
  configKey?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateLaunchTransactionRequest = await request.json();
    
    // Validate required fields
    if (!body.tokenMint || !body.tokenMetadata || !body.creatorWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenMint, tokenMetadata, creatorWallet' },
        { status: 400 }
      );
    }

    // Initialize Solana connection and BagsApp SDK
    const connection = new Connection(SOLANA_RPC_URL!);
    const sdk = new BagsSDK(BAGS_API_KEY!, connection, 'processed');

    const creatorPublicKey = new PublicKey(body.creatorWallet);
    const baseMint = new PublicKey(body.tokenMint);
    const wsolMint = new PublicKey('So11111111111111111111111111111111111111112');

    console.log(`🔧 Creating launch transaction for token ${body.tokenMint}`);
    console.log(`💰 Initial buy amount: ${body.initialBuyAmount} SOL (${Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL)} lamports)`);

    console.log('⚙️  Ensuring fee-share configuration exists for base mint...');

    // Resolve the platform fee claimer wallet from Twitter username (per docs)
    // https://bags.mintlify.app/api-reference/get-fee-share-wallet
    const feeClaimerTwitter = 'splitzdotfun';
    const feeShareWallet = await sdk.state.getLaunchWalletForTwitterUsername(feeClaimerTwitter);

    console.log('✨ Fee share wallet (platform):', feeShareWallet.toString());

    // Create Fee Share Config bound to this base mint and wSOL quote
    // https://bags.mintlify.app/api-reference/create-fee-share-configuration
    const feeShareConfig = await sdk.config.createFeeShareConfig({
      users: [
        { wallet: creatorPublicKey, bps: 0 },          // 0% creator per current platform rules
        { wallet: feeShareWallet, bps: 10000 },        // 100% platform
      ],
      payer: creatorPublicKey,
      baseMint,
      quoteMint: wsolMint,
    });

    // If config needs to be created, return the config creation transaction first
    if (feeShareConfig.transaction) {
      console.log('🔧 Fee-share config missing. Returning config creation transaction for signing...');

      const serializedConfigTransaction = feeShareConfig.transaction.serialize();

      const response: CreateLaunchTransactionResponse = {
        success: true,
        transaction: Array.from(serializedConfigTransaction),
        message: 'Configuration transaction created! Sign this first, then we\'ll create the launch transaction.',
        isConfigTransaction: true,
        configKey: feeShareConfig.configKey.toString(),
      };

      console.log('✅ Fee-share config transaction created successfully');
      return NextResponse.json(response);
    }

    console.log('♻️  Fee-share config already exists, reusing config key:', feeShareConfig.configKey.toString());

    console.log('🎯 Creating token launch transaction tied to fee-share config...');

    // Create token launch transaction
    // https://bags.mintlify.app/api-reference/create-token-launch-transaction
    const tokenLaunchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl: body.tokenMetadata,
      tokenMint: baseMint,
      launchWallet: creatorPublicKey,
      initialBuyLamports: Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL),
      configKey: feeShareConfig.configKey,
    });

    // Return the launch transaction for signing
    const serializedLaunchTransaction = tokenLaunchTransaction.serialize();

    console.log('✅ Launch transaction created successfully');
    console.log(`💰 Estimated cost: ${body.initialBuyAmount} SOL (initial buy) + fees`);

    const response: CreateLaunchTransactionResponse = {
      success: true,
      transaction: Array.from(serializedLaunchTransaction),
      message: 'Launch transaction created successfully! Ready for signing.',
      isConfigTransaction: false,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error creating launch transaction:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create launch transaction',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
