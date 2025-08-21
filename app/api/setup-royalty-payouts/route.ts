import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 Setting up royalty_payouts table...');

    // Check if table already exists
    console.log('🔧 Checking if table exists...');
    
    const { data: existingTable, error: checkError } = await supabase
      .from('royalty_payouts')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist, we need to create it
      console.log('📋 Table does not exist, you need to run the SQL manually');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Table does not exist',
          message: 'Please run the SQL in create_royalty_payouts_table.sql manually in your Supabase SQL editor',
          sql_file: 'create_royalty_payouts_table.sql'
        },
        { status: 404 }
      );
    } else if (checkError) {
      console.error('❌ Error checking table:', checkError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error checking table',
          details: checkError 
        },
        { status: 500 }
      );
    }

    console.log('✅ royalty_payouts table exists');

    // Get some basic stats about the table
    const { count: totalPayouts, error: countError } = await supabase
      .from('royalty_payouts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting payouts:', countError);
    }

    return NextResponse.json({
      success: true,
      message: 'royalty_payouts table is ready',
      table_exists: true,
      total_payouts: totalPayouts || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected error setting up table:', error);
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
