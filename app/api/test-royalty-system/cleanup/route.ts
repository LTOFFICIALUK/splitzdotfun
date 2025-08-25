import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

const TEST_TOKEN_ADDRESS = 'Eme5T2s2HB7B8W4YgLG1eReQpnadEVUnQBRjaKTdBAGS';

// POST - Clean up test data
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧹 Starting test data cleanup...');

    const results = {
      cleaned: [] as string[],
      errors: [] as string[],
      summary: {
        tables_cleaned: 0,
        records_removed: 0,
        errors: 0
      }
    };

    // Get test token ID
    const { data: testToken } = await supabase
      .from('tokens')
      .select('id')
      .eq('contract_address', TEST_TOKEN_ADDRESS)
      .single();

    if (!testToken) {
      return NextResponse.json({
        success: true,
        message: 'No test token found to clean up',
        data: results
      });
    }

    console.log(`🗑️ Found test token with ID: ${testToken.id}`);

    // Clean up in reverse dependency order
    const cleanupSteps = [
      {
        name: 'Fee Accrual Ledger',
        table: 'fee_accrual_ledger',
        condition: { token_id: testToken.id }
      },
      {
        name: 'Royalty Changes History',
        table: 'royalty_changes_history',
        condition: { token_id: testToken.id }
      },
      {
        name: 'Royalty Agreement Version Shares',
        table: 'royalty_agreement_version_shares',
        condition: { agreement_version_id: null } // Will be cleaned via cascade
      },
      {
        name: 'Royalty Agreement Versions',
        table: 'royalty_agreement_versions',
        condition: { token_id: testToken.id }
      },
      {
        name: 'Token Ownership',
        table: 'token_ownership',
        condition: { token_id: testToken.id }
      },
      {
        name: 'Test Token',
        table: 'tokens',
        condition: { id: testToken.id }
      }
    ];

    for (const step of cleanupSteps) {
      try {
        console.log(`🧹 Cleaning ${step.name}...`);
        
        const { error, count } = await supabase
          .from(step.table)
          .delete()
          .match(step.condition);

        if (error) {
          console.error(`❌ Error cleaning ${step.name}:`, error);
          results.errors.push(`${step.name}: ${error.message}`);
          results.summary.errors++;
        } else {
          console.log(`✅ Cleaned ${step.name}: ${count || 0} records`);
          results.cleaned.push(`${step.name}: ${count || 0} records`);
          results.summary.tables_cleaned++;
          results.summary.records_removed += count || 0;
        }
      } catch (error) {
        console.error(`❌ Exception cleaning ${step.name}:`, error);
        results.errors.push(`${step.name}: ${error instanceof Error ? error.message : String(error)}`);
        results.summary.errors++;
      }
    }

    console.log('🧹 Test data cleanup completed!');
    console.log(`📊 Summary: ${results.summary.tables_cleaned} tables cleaned, ${results.summary.records_removed} records removed`);

    return NextResponse.json({
      success: true,
      message: 'Test data cleanup completed',
      data: results
    });

  } catch (error) {
    console.error('❌ Error in test data cleanup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cleanup failed', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
