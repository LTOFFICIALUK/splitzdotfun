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

interface TokenLaunchFinalRequest {
  tokenMint: string;
  tokenMetadata: string;
  initialBuyAmount: number;
  creatorWallet: string;
  privateKey: string; // Base58 encoded private key from user's wallet
}

interface TokenLaunchFinalResponse {
  success: boolean;
  tokenAddress: string;
  symbol: string;
  websiteUrl: string;
  message: string;
  transactionSignature: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TokenLaunchFinalRequest = await request.json();
    
    // Validate required fields
    if (!body.tokenMint || !body.tokenMetadata || !body.creatorWallet || !body.privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenMint, tokenMetadata, creatorWallet, privateKey' },
        { status: 400 }
      );
    }

    // Initialize Solana connection and BagsApp SDK
    const connection = new Connection(SOLANA_RPC_URL!);
    const sdk = new BagsSDK(BAGS_API_KEY!, connection, 'processed');

    // Create keypair from user's private key
    const keypair = Keypair.fromSecretKey(bs58.decode(body.privateKey));

    console.log(`🚀 Launching token ${body.tokenMint} with wallet ${keypair.publicKey.toBase58()}`);

    const sdkConnection = sdk.state.getConnection();
    const commitment = sdk.state.getCommitment();

    console.log('⚙️  Fetching configuration...');

    // Get existing config or config creation TX
    const configResponse = await sdk.config.getOrCreateConfig(keypair.publicKey);

    // Config does not exist, create it
    if (configResponse.transaction) { 
      console.log('🔧 Config does not exist, creating new configuration...');
      configResponse.transaction.sign([keypair]);

      const blockhash = await sdkConnection.getLatestBlockhash(commitment);

      const txSignature = await sdkConnection.sendTransaction(configResponse.transaction, { 
        maxRetries: 0, 
        skipPreflight: true 
      });

      const confirmed = await sdkConnection.confirmTransaction({
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        signature: txSignature,
      }, commitment);

      if (confirmed.value.err) { 
        console.error('❌ Error creating config:', confirmed.value.err);
        throw new Error('Error creating config');
      }
      else {
        console.log('✅ Configuration successfully created!');
      }
    }
    else {
      console.log('♻️  Config already exists, reusing config key:', configResponse.configKey.toString());
    }

    console.log('🎯 Creating token launch transaction...');

    // Create token launch
    const tokenLaunchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl: body.tokenMetadata,
      tokenMint: new PublicKey(body.tokenMint),
      launchWallet: keypair.publicKey,
      initialBuyLamports: Math.floor(body.initialBuyAmount * LAMPORTS_PER_SOL),
      configKey: configResponse.configKey,
    });

    tokenLaunchTransaction.sign([keypair]);

    const blockhash = await sdkConnection.getLatestBlockhash(commitment);

    const txSignature = await sdkConnection.sendTransaction(tokenLaunchTransaction, { 
      maxRetries: 0, 
      skipPreflight: true 
    });

    console.log('🔑 Confirming transaction signature:', txSignature);

    const confirmed = await sdkConnection.confirmTransaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      signature: txSignature,
    }, commitment);

    if (confirmed.value.err) {
      console.error('💥 Error creating token launch:', confirmed.value.err);
      throw new Error('Error creating token launch');
    }

    console.log('🎉 Token launched successfully!');

    const response: TokenLaunchFinalResponse = {
      success: true,
      tokenAddress: body.tokenMint,
      symbol: 'TOKEN', // You might want to pass this from the frontend
      websiteUrl: `https://splitz.fun/token/${body.tokenMint}`,
      message: 'Token launched successfully!',
      transactionSignature: txSignature
    };

    console.log('✅ Token launch completed:', response);
    return NextResponse.json(response);

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
