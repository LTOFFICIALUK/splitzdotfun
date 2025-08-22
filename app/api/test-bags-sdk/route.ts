import { NextRequest, NextResponse } from 'next/server';

// Add error handling around imports
let BagsSDK: any;
let Connection: any;
let PublicKey: any;

try {
  BagsSDK = require('@bagsfm/bags-sdk').BagsSDK;
  const web3 = require('@solana/web3.js');
  Connection = web3.Connection;
  PublicKey = web3.PublicKey;
} catch (importError) {
  console.error('❌ API: Failed to import required modules:', importError);
}

// Initialize BagsApp API configuration
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 API: Testing Bags SDK...');
    
    // Check if imports were successful
    if (!BagsSDK || !Connection || !PublicKey) {
      return NextResponse.json({
        success: false,
        error: 'Required modules failed to import',
        imports: {
          BagsSDK: !!BagsSDK,
          Connection: !!Connection,
          PublicKey: !!PublicKey
        }
      });
    }

    if (!BAGS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'BAGS_API_KEY environment variable is missing'
      });
    }

    console.log('🔧 API: Initializing SDK...');
    
    // Initialize Solana connection and BagsApp SDK
    const connection = new Connection(SOLANA_RPC_URL!);
    const sdk = new BagsSDK(BAGS_API_KEY!, connection, 'processed');

    console.log('✅ SDK initialized successfully');

    // Test 1: Check SDK structure
    const sdkMethods = {
      hasState: !!sdk.state,
      hasConfig: !!sdk.config,
      hasTokenLaunch: !!sdk.tokenLaunch,
      stateMethods: sdk.state ? Object.keys(sdk.state) : [],
      configMethods: sdk.config ? Object.keys(sdk.config) : [],
      tokenLaunchMethods: sdk.tokenLaunch ? Object.keys(sdk.tokenLaunch) : []
    };

    console.log('📋 SDK methods available:', sdkMethods);

    // Test 2: Try to get fee share wallet
    let feeShareWalletTest = null;
    try {
      console.log('🔍 Testing getLaunchWalletForTwitterUsername...');
      const feeShareWallet = await sdk.state.getLaunchWalletForTwitterUsername('splitzdotfun');
      feeShareWalletTest = {
        success: true,
        wallet: feeShareWallet.toString()
      };
      console.log('✅ Fee share wallet test successful:', feeShareWallet.toString());
    } catch (error) {
      feeShareWalletTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ Fee share wallet test failed:', error);
    }

    return NextResponse.json({
      success: true,
      sdkMethods,
      feeShareWalletTest,
      environment: {
        hasApiKey: !!BAGS_API_KEY,
        apiKeyPrefix: BAGS_API_KEY ? BAGS_API_KEY.substring(0, 10) + '...' : 'missing',
        rpcUrl: SOLANA_RPC_URL
      }
    });

  } catch (error) {
    console.error('❌ Bags SDK test error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test Bags SDK',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
