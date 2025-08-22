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

    console.log('🧪 Testing token creation step...');

    // Test with a simple image
    const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // Fetch image from URL to blob
    console.log('🖼️ Fetching test image...');
    const imageResponse = await fetch(testImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBlob = await imageResponse.blob();
    console.log('✅ Image fetched, size:', imageBlob.size);

    // Create FormData for the image
    const formData = new FormData();
    formData.append('image', imageBlob, 'test-token.png');
    formData.append('name', 'Test Token');
    formData.append('symbol', 'TEST');
    formData.append('description', 'Test token for debugging');
    formData.append('website', 'https://splitz.fun/token/placeholder');

    console.log('🔧 Creating token info and metadata...');
    const tokenResponse = await fetch(`${BAGS_API_BASE_URL}/token-launch/create-token-info`, {
      method: 'POST',
      headers: {
        'x-api-key': BAGS_API_KEY,
      },
      body: formData
    });

    console.log('📊 Token creation response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token creation failed:', errorText);
      return NextResponse.json({
        success: false,
        error: `Token creation failed: ${tokenResponse.status}`,
        details: errorText
      }, { status: tokenResponse.status });
    }

    const tokenInfo = await tokenResponse.json();
    console.log('✅ Token creation successful:', tokenInfo);

    return NextResponse.json({
      success: true,
      message: 'Token creation test successful',
      tokenInfo: tokenInfo
    });

  } catch (error) {
    console.error('❌ Token creation test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Token creation test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
