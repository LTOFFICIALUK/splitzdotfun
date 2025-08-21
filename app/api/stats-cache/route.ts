import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const statKey = searchParams.get('key'); // Optional: fetch specific stat
    const keys = searchParams.get('keys'); // Optional: fetch multiple stats

    console.log('📊 Fetching cached stats...');

    let query = supabase
      .from('stats_cache')
      .select('stat_key, stat_name, value_numeric, value_text, value_json, last_calculated, next_update');

    // If specific key requested
    if (statKey) {
      query = query.eq('stat_key', statKey);
    }
    // If multiple keys requested
    else if (keys) {
      const keyArray = keys.split(',');
      query = query.in('stat_key', keyArray);
    }

    const { data: stats, error } = await query;

    if (error) {
      console.error('❌ Error fetching stats cache:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error fetching stats cache',
          details: error 
        },
        { status: 500 }
      );
    }

    // Convert to key-value object for easier consumption
    const statsObject: Record<string, any> = {};
    stats?.forEach(stat => {
      statsObject[stat.stat_key] = {
        name: stat.stat_name,
        numeric: stat.value_numeric,
        text: stat.value_text,
        json: stat.value_json,
        last_calculated: stat.last_calculated,
        next_update: stat.next_update
      };
    });

    console.log(`✅ Fetched ${stats?.length || 0} cached stats`);

    return NextResponse.json({
      success: true,
      data: statsObject,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching stats cache:', error);
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
