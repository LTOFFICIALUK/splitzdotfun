import { NextRequest, NextResponse } from 'next/server';

interface TokenLaunchRequest {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitterUrl?: string;
  initialBuyAmount: number;
  creatorWallet: string;
}

interface TokenLaunchResponse {
  success: boolean;
  tokenMint: string;
  tokenMetadata: string;
  message: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 API: Starting simple token launch...');
    
    const body: TokenLaunchRequest = await request.json();
    console.log('📥 API: Request body received:', { 
      name: body.name, 
      symbol: body.symbol, 
      hasImage: !!body.imageUrl,
      creatorWallet: body.creatorWallet 
    });
    
    // Validate required fields
    if (!body.name || !body.symbol || !body.description || !body.imageUrl || !body.creatorWallet) {
      console.log('❌ API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, description, imageUrl, creatorWallet' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting simple token creation...');
    console.log(`📝 Token: ${body.name} (${body.symbol})`);
    console.log(`💰 Initial buy: ${body.initialBuyAmount} SOL`);
    console.log(`👤 Creator: ${body.creatorWallet}`);

    // Generate a mock token mint address (in real implementation, this would be created on-chain)
    const mockTokenMint = `Token${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a simple metadata URI
    const tokenMetadata = `https://splitz.fun/metadata/${mockTokenMint}`;

    console.log('✅ Simple token creation completed!');
    console.log(`🪙 Token mint: ${mockTokenMint}`);
    console.log(`📄 Metadata URI: ${tokenMetadata}`);

    const response: TokenLaunchResponse = {
      success: true,
      tokenMint: mockTokenMint,
      tokenMetadata: tokenMetadata,
      message: 'Token created successfully! This is a simplified version without Bags integration.',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Token creation error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create token',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
