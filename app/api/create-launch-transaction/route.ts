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

    console.log(`🔧 Creating launch transaction for token ${body.tokenMint}`);

    const sdkConnection = sdk.state.getConnection();
    const commitment = sdk.state.getCommitment();

    console.log('⚙️  Fetching configuration...');

    // Get existing config or config creation TX
    const configResponse = await sdk.config.getOrCreateConfig(creatorPublicKey);

    // If config doesn't exist, we need to create it first
    if (configResponse.transaction) { 
      console.log('🔧 Config does not exist, creating configuration transaction...');
      
      // Return the config creation transaction for signing
      const serializedConfigTransaction = configResponse.transaction.serialize();
      
      const response: CreateLaunchTransactionResponse = {
        success: true,
        transaction: Array.from(serializedConfigTransaction),
        message: 'Configuration transaction created! Sign this first, then we\'ll create the launch transaction.',
        isConfigTransaction: true,
        configKey: configResponse.configKey.toString()
      };

      console.log('✅ Config transaction created successfully');
      return NextResponse.json(response);
    }
    else {
      console.log('♻️  Config already exists, reusing config key:', configResponse.configKey.toString());
    }

    console.log('🎯 Creating token launch transaction...');

    // Create token launch transaction
    const tokenLaunchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl: body.tokenMetadata,
      tokenMint: new PublicKey(body.tokenMint),
      launchWallet: creatorPublicKey,
      initialBuyLamports: Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL),
      configKey: configResponse.configKey,
    });

    // Return the launch transaction for signing
    const serializedLaunchTransaction = tokenLaunchTransaction.serialize();

    const response: CreateLaunchTransactionResponse = {
      success: true,
      transaction: Array.from(serializedLaunchTransaction), // Convert to array for JSON
      message: 'Launch transaction created successfully! Ready for signing.',
      isConfigTransaction: false
    };

    console.log('✅ Launch transaction created successfully');
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
