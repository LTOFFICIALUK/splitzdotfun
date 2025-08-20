import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 Testing database connection...');
    console.log('🔧 Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('🔧 Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        serviceKey: !!supabaseServiceKey
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test basic connection
    const { data, error } = await supabase
      .from('tokens')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database test failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error.message,
        code: error.code
      });
    }

    console.log('✅ Database test successful');
    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      data: data
    });

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
