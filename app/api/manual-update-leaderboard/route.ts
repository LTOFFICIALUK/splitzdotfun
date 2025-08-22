import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (for cron job security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Only check authorization if CRON_SECRET is set
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('❌ Unauthorized access attempt to manual-update-leaderboard');
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn('⚠️ CRON_SECRET not set - skipping authorization check');
    }
    
    console.log('🔄 Manually triggering royalty leaderboard update...');

    // Construct the base URL properly
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // Fallback to Vercel URL if available
    if (!baseUrl && process.env.NEXT_PUBLIC_VERCEL_URL) {
      baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }
    
    // Final fallback to localhost
    if (!baseUrl) {
      baseUrl = 'http://localhost:3000';
    }
    
    console.log(`🔗 Using base URL: ${baseUrl}`);
    
    // Make internal call to update leaderboard
    const response = await fetch(`${baseUrl}/api/update-royalty-leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Leaderboard update failed:', data);
      return NextResponse.json(
        { 
          success: false,
          error: 'Leaderboard update failed',
          details: data
        },
        { status: response.status }
      );
    }

    console.log('✅ Manual leaderboard update completed:', data);

    return NextResponse.json({
      success: true,
      message: 'Manual leaderboard update completed',
      results: data.results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error in manual leaderboard update:', error);
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
