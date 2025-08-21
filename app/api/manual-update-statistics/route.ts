import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // This route manually triggers the token statistics update
    // Useful for testing or manual updates
    
    const baseUrl = process.env.NEXTAUTH_URL || 'https://splitz.fun';
    const updateUrl = `${baseUrl}/api/update-token-statistics`;
    
    console.log('🔄 Manually triggering token statistics update...');
    
    const response = await fetch(updateUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization if CRON_SECRET is set
        ...(process.env.CRON_SECRET && {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        })
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Manual update failed:', result);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Manual update failed',
          details: result 
        },
        { status: response.status }
      );
    }

    console.log('✅ Manual update completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Manual token statistics update completed',
      result: result
    });

  } catch (error) {
    console.error('❌ Error in manual update:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
