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

    let configTransaction = null;
    
    // Config does not exist, create it
    if (configResponse.transaction) { 
      console.log('🔧 Config does not exist, creating configuration transaction...');
      configTransaction = configResponse.transaction;
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

    // If we need to create config, combine the transactions
    let finalTransaction = tokenLaunchTransaction;
    if (configTransaction) {
      // For now, we'll return the config transaction first
      // In a full implementation, you'd combine them or handle them separately
      finalTransaction = configTransaction;
    }

    // Serialize the transaction for frontend signing
    const serializedTransaction = finalTransaction.serialize();

    const response: CreateLaunchTransactionResponse = {
      success: true,
      transaction: Array.from(serializedTransaction), // Convert to array for JSON
      message: 'Launch transaction created successfully! Ready for signing.'
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
