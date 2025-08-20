import { NextRequest, NextResponse } from 'next/server';
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

    console.log(`🔧 Creating launch transaction for token ${body.tokenMint}`);
    console.log(`💰 Initial buy amount: ${body.initialBuyAmount} SOL (${Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL)} lamports)`);

    // Step 1: Check if config exists
    console.log('⚙️  Checking if config exists...');
    
    try {
      // Try to get existing config first
      const configCheckResponse = await fetch('https://public-api-v2.bags.fm/api/v1/token-launch/get-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BAGS_API_KEY
        },
        body: JSON.stringify({
          launchWallet: body.creatorWallet
        })
      });

      if (configCheckResponse.ok) {
        console.log('♻️  Config already exists, proceeding with launch transaction');
        
        // Step 2: Create launch transaction directly
        console.log('🎯 Creating token launch transaction...');
        
        const launchResponse = await fetch('https://public-api-v2.bags.fm/api/v1/token-launch/create-launch-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': BAGS_API_KEY
          },
          body: JSON.stringify({
            tokenMint: body.tokenMint,
            metadataUrl: body.tokenMetadata,
            launchWallet: body.creatorWallet,
            initialBuyLamports: Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL)
          })
        });

        if (!launchResponse.ok) {
          const errorData = await launchResponse.json();
          throw new Error(`Launch transaction creation failed: ${errorData.error || 'Unknown error'}`);
        }

        const launchResult = await launchResponse.json();
        
        console.log('✅ Launch transaction created successfully');
        console.log(`💰 Estimated cost: ${body.initialBuyAmount} SOL (initial buy) + ~0.000005 SOL (fees)`);
        
        const response: CreateLaunchTransactionResponse = {
          success: true,
          transaction: launchResult.response.tx,
          message: 'Launch transaction created successfully! Ready for signing.',
          isConfigTransaction: false
        };

        return NextResponse.json(response);
      }
    } catch (configError) {
      console.log('🔧 Config does not exist, creating configuration first...');
    }

    // Step 1: Create config transaction
    console.log('🔧 Creating configuration transaction...');
    
    const configResponse = await fetch('https://public-api-v2.bags.fm/api/v1/token-launch/create-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BAGS_API_KEY
      },
      body: JSON.stringify({
        launchWallet: body.creatorWallet
      })
    });

    if (!configResponse.ok) {
      const errorData = await configResponse.json();
      throw new Error(`Config creation failed: ${errorData.error || 'Unknown error'}`);
    }

    const configResult = await configResponse.json();
    
    console.log('✅ Config transaction created successfully');
    console.log(`💰 Config creation cost: ~0.01-0.02 SOL (one-time)`);
    
    const response: CreateLaunchTransactionResponse = {
      success: true,
      transaction: configResult.response.tx,
      message: 'Configuration transaction created! Sign this first, then we\'ll create the launch transaction.',
      isConfigTransaction: true,
      configKey: configResult.response.configKey
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
