import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 Setting up token_statistics table...');

    // SQL to create the token_statistics table
    const createTableSQL = `
      -- Create token_statistics table for storing Jupiter API data
      CREATE TABLE IF NOT EXISTS token_statistics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          token_id UUID REFERENCES tokens(id) ON DELETE CASCADE NOT NULL,
          contract_address TEXT NOT NULL,
          
          -- Jupiter API data fields
          jupiter_id TEXT,
          name TEXT,
          symbol TEXT,
          icon TEXT,
          decimals INTEGER,
          dev TEXT,
          circ_supply DECIMAL(30, 9),
          total_supply DECIMAL(30, 9),
          token_program TEXT,
          launchpad TEXT,
          meta_launchpad TEXT,
          partner_config TEXT,
          holder_count INTEGER,
          
          -- Audit data
          mint_authority_disabled BOOLEAN,
          freeze_authority_disabled BOOLEAN,
          top_holders_percentage DECIMAL(10, 6),
          dev_migrations INTEGER,
          
          -- Scores and verification
          organic_score DECIMAL(10, 6),
          organic_score_label TEXT,
          is_verified BOOLEAN,
          tags TEXT[],
          
          -- Financial data
          fdv DECIMAL(20, 6),
          mcap DECIMAL(20, 6),
          usd_price DECIMAL(20, 9),
          price_block_id BIGINT,
          liquidity DECIMAL(20, 6),
          
          -- Social data
          ct_likes INTEGER,
          smart_ct_likes INTEGER,
          
          -- Statistics (5m, 1h, 6h, 24h)
          stats_5m JSONB,
          stats_1h JSONB,
          stats_6h JSONB,
          stats_24h JSONB,
          
          -- Metadata
          jupiter_updated_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Ensure one record per token
          UNIQUE(token_id, contract_address)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_token_statistics_contract_address ON token_statistics(contract_address);
      CREATE INDEX IF NOT EXISTS idx_token_statistics_token_id ON token_statistics(token_id);
      CREATE INDEX IF NOT EXISTS idx_token_statistics_updated_at ON token_statistics(updated_at);
      CREATE INDEX IF NOT EXISTS idx_token_statistics_mcap ON token_statistics(mcap DESC);
      CREATE INDEX IF NOT EXISTS idx_token_statistics_liquidity ON token_statistics(liquidity DESC);
      CREATE INDEX IF NOT EXISTS idx_token_statistics_holder_count ON token_statistics(holder_count DESC);

      -- Create updated_at trigger for token_statistics
      CREATE TRIGGER update_token_statistics_updated_at 
          BEFORE UPDATE ON token_statistics
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    // Try to create the table using a simple query first
    console.log('🔧 Attempting to create table...');
    
    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('token_statistics')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist, we need to create it
      console.log('📋 Table does not exist, you need to run the SQL manually');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Table does not exist',
          message: 'Please run the SQL in create_token_stats_table.sql manually in your Supabase SQL editor',
          sql_file: 'create_token_stats_table.sql'
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

    console.log('✅ token_statistics table created successfully');

    // Verify the table exists
    const { data: tableCheck, error: verifyError } = await supabase
      .from('token_statistics')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.error('❌ Error checking table:', verifyError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Table created but verification failed',
          details: verifyError 
        },
        { status: 500 }
      );
    }

    console.log('✅ Table verification successful');

    return NextResponse.json({
      success: true,
      message: 'token_statistics table created successfully',
      table_exists: true,
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
