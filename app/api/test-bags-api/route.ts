import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const BAGS_API_KEY = process.env.BAGS_API_KEY;
    const BAGS_API_BASE_URL = 'https://public-api-v2.bags.fm/api/v1';

    console.log('🧪 Testing Bags API connection...');
    console.log('🔑 BAGS_API_KEY present:', !!BAGS_API_KEY);
    console.log('🔗 BAGS_API_BASE_URL:', BAGS_API_BASE_URL);

    if (!BAGS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'BAGS_API_KEY environment variable is missing'
      }, { status: 500 });
    }

    // Test 1: Check if we can get the creator fee wallet
    console.log('🧪 Test 1: Getting creator fee wallet...');
    const creatorFeeWalletResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/fee-share/wallet/twitter?twitterUsername=launchonsplitz`, {
      method: 'GET',
      headers: {
        'x-api-key': BAGS_API_KEY,
      }
    });

    console.log('📊 Creator fee wallet response status:', creatorFeeWalletResponse.status);
    
    if (!creatorFeeWalletResponse.ok) {
      const errorText = await creatorFeeWalletResponse.text();
      return NextResponse.json({
        success: false,
        error: `Creator fee wallet lookup failed: ${creatorFeeWalletResponse.status}`,
        details: errorText
      }, { status: creatorFeeWalletResponse.status });
    }

    const creatorFeeWalletData = await creatorFeeWalletResponse.json();
    console.log('✅ Creator fee wallet:', creatorFeeWalletData.response);

    // Test 2: Check if we can get the platform fee wallet
    console.log('🧪 Test 2: Getting platform fee wallet...');
    const platformFeeWalletResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/fee-share/wallet/twitter?twitterUsername=splitzdotfun`, {
      method: 'GET',
      headers: {
        'x-api-key': BAGS_API_KEY,
      }
    });

    console.log('📊 Platform fee wallet response status:', platformFeeWalletResponse.status);
    
    if (!platformFeeWalletResponse.ok) {
      const errorText = await platformFeeWalletResponse.text();
      return NextResponse.json({
        success: false,
        error: `Platform fee wallet lookup failed: ${platformFeeWalletResponse.status}`,
        details: errorText
      }, { status: platformFeeWalletResponse.status });
    }

    const platformFeeWalletData = await platformFeeWalletResponse.json();
    console.log('✅ Platform fee wallet:', platformFeeWalletData.response);

    return NextResponse.json({
      success: true,
      message: 'Bags API connection test successful',
      creatorFeeWallet: creatorFeeWalletData.response,
      platformFeeWallet: platformFeeWalletData.response,
      apiKeyPresent: !!BAGS_API_KEY
    });

  } catch (error) {
    console.error('❌ Bags API test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Bags API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
