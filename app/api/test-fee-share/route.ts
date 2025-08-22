import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const BAGS_API_KEY = process.env.BAGS_API_KEY;
    const BAGS_API_BASE_URL = 'https://public-api-v2.bags.fm/api/v1';

    if (!BAGS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'BAGS_API_KEY not set'
      }, { status: 500 });
    }

    console.log('🧪 Testing fee share configuration step...');

    // Step 1: Get creator fee wallet
    console.log('🔍 Step 1: Getting creator fee wallet...');
    const creatorFeeWalletResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/fee-share/wallet/twitter?twitterUsername=launchonsplitz`, {
      method: 'GET',
      headers: {
        'x-api-key': BAGS_API_KEY,
      }
    });

    if (!creatorFeeWalletResponse.ok) {
      const errorText = await creatorFeeWalletResponse.text();
      throw new Error(`Creator fee wallet lookup failed: ${creatorFeeWalletResponse.status} ${errorText}`);
    }

    const creatorFeeWalletData = await creatorFeeWalletResponse.json();
    const creatorFeeWallet = creatorFeeWalletData.response;
    console.log(`✅ Creator fee wallet: ${creatorFeeWallet}`);

    // Step 2: Get platform fee wallet
    console.log('🔍 Step 2: Getting platform fee wallet...');
    const platformFeeWalletResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/fee-share/wallet/twitter?twitterUsername=splitzdotfun`, {
      method: 'GET',
      headers: {
        'x-api-key': BAGS_API_KEY,
      }
    });

    if (!platformFeeWalletResponse.ok) {
      const errorText = await platformFeeWalletResponse.text();
      throw new Error(`Platform fee wallet lookup failed: ${platformFeeWalletResponse.status} ${errorText}`);
    }

    const platformFeeWalletData = await platformFeeWalletResponse.json();
    const platformWallet = platformFeeWalletData.response;
    console.log(`✅ Platform fee wallet: ${platformWallet}`);

    // Step 3: Test fee share configuration with a real token mint
    console.log('⚙️ Step 3: Testing fee share configuration...');
    
    const wsolMint = 'So11111111111111111111111111111111111111112';
    // Use a real, existing token mint instead of our test token
    const realTokenMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint (for testing)
    const testCreatorWallet = '6m4GhWkYGgrzwjUYC5oZaut3TGqWPV3y94kpcmykeL9E'; // Your wallet
    
    const feeSharePayload = {
      walletA: creatorFeeWallet,
      walletB: platformWallet,
      walletABps: 0,
      walletBBps: 10000,
      payer: testCreatorWallet,
      baseMint: realTokenMint,
      quoteMint: wsolMint
    };
    
    console.log('🔧 Fee share payload:', feeSharePayload);
    
    const feeShareResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/fee-share/create-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BAGS_API_KEY,
      },
      body: JSON.stringify(feeSharePayload)
    });

    console.log('📊 Fee share response status:', feeShareResponse.status);

    if (!feeShareResponse.ok) {
      const errorText = await feeShareResponse.text();
      console.error('❌ Fee share config failed:', errorText);
      return NextResponse.json({
        success: false,
        error: `Fee share config failed: ${feeShareResponse.status}`,
        details: errorText,
        payload: feeSharePayload
      }, { status: feeShareResponse.status });
    }

    const feeShareConfig = await feeShareResponse.json();
    console.log('✅ Fee share config successful:', feeShareConfig);

    return NextResponse.json({
      success: true,
      message: 'Fee share configuration test successful',
      feeShareConfig: feeShareConfig,
      payload: feeSharePayload
    });

  } catch (error) {
    console.error('❌ Fee share test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Fee share test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
