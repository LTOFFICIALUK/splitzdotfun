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
        console.log('❌ Unauthorized access attempt to manual-update-statistics');
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn('⚠️ CRON_SECRET not set - skipping authorization check');
    }
    
    // This route manually triggers the token statistics update
    // Useful for testing or manual updates
    
    // Determine base URL from request origin first, then env fallbacks
    let baseUrl: string | null = null;
    try {
      const { origin } = new URL(request.url);
      baseUrl = origin;
    } catch {}

    if (!baseUrl && process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    }

    if (!baseUrl && process.env.NEXTAUTH_URL) {
      baseUrl = process.env.NEXTAUTH_URL;
    }

    if (!baseUrl && process.env.NEXT_PUBLIC_VERCEL_URL) {
      baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }

    if (!baseUrl) {
      baseUrl = 'https://splitz.fun';
    }
    
    const updateUrl = `${baseUrl}/api/update-token-statistics`;
    
    console.log('🔄 Manually triggering token statistics update...');
    console.log(`🔗 Using update URL: ${updateUrl}`);
    
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

    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

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
