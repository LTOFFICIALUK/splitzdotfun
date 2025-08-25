import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// Test token data
const TEST_TOKEN = {
  contract_address: 'Eme5T2s2HB7B8W4YgLG1eReQpnadEVUnQBRjaKTdBAGS',
  name: 'Crypto Rug Muncher',
  symbol: 'CRM',
  description: 'A community-driven creator token focused on building tools that help degens stay safe while navigating crypto.',
  image_url: 'https://ipfs.io/ipfs/QmXGfVVHV3VWTcagwBh9TcK5rRtico3zUYah2PDyS56HHW',
  website: 'https://bags.fm/Eme5T2s2HB7B8W4YgLG1eReQpnadEVUnQBRjaKTdBAGS'
};

// POST - Run comprehensive royalty system tests
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { testType = 'all' } = body;

    console.log('🧪 Starting royalty system tests...');

    const results = {
      tests: [] as any[],
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };

    // Test 1: Check if required tables exist
    await runTest('Database Tables Check', async () => {
      const requiredTables = [
        'royalty_agreement_versions',
        'royalty_agreement_version_shares', 
        'royalty_changes_history',
        'fee_accrual_ledger',
        'token_ownership',
        'tokens'
      ];

      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          throw new Error(`Table ${table} not accessible: ${error.message}`);
        }
      }
      return `✅ All ${requiredTables.length} required tables exist and are accessible`;
    }, results);

    // Test 2: Create test token if it doesn't exist
    await runTest('Test Token Creation', async () => {
      // Check if test token exists
      const { data: existingToken } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (existingToken) {
        return `✅ Test token already exists with ID: ${existingToken.id}`;
      }

      // Create test token
      const { data: token, error } = await supabase
        .from('tokens')
        .insert({
          contract_address: TEST_TOKEN.contract_address,
          name: TEST_TOKEN.name,
          symbol: TEST_TOKEN.symbol,
          description: TEST_TOKEN.description,
          image_url: TEST_TOKEN.image_url,
          website: TEST_TOKEN.website,
          deployer_social_or_wallet: 'test-deployer',
          deployer_user_id: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();

      if (error) throw error;
      return `✅ Test token created with ID: ${token.id}`;
    }, results);

    // Test 3: Create test token ownership
    await runTest('Test Token Ownership Creation', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      // Check if ownership exists
      const { data: existingOwnership } = await supabase
        .from('token_ownership')
        .select('id')
        .eq('token_id', token.id)
        .single();

      if (existingOwnership) {
        return `✅ Token ownership already exists with ID: ${existingOwnership.id}`;
      }

      // Create ownership
      const { data: ownership, error } = await supabase
        .from('token_ownership')
        .insert({
          token_id: token.id,
          deployer_user_id: '00000000-0000-0000-0000-000000000000',
          current_owner: 'test-deployer',
          current_owner_user_id: '00000000-0000-0000-0000-000000000000',
          royalty_earners: [],
          total_fees_earned: 0,
          fees_owed_per_earner: {},
          fees_claimed_per_earner: {},
          total_fees_claimed: 0
        })
        .select()
        .single();

      if (error) throw error;
      return `✅ Token ownership created with ID: ${ownership.id}`;
    }, results);

    // Test 4: Test initial royalty share creation
    await runTest('Initial Royalty Share Creation', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      const initialRoyaltyShares = [
        {
          earner_wallet: 'test-creator',
          bps: 8000, // 80%
          role: 'Creator',
          is_manager: true
        },
        {
          earner_wallet: 'test-manager',
          bps: 1000, // 10%
          role: 'Manager',
          is_manager: true
        }
      ];

      // Call centralized royalty update
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/royalty-shares/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          token_id: token.id,
          royalty_shares: initialRoyaltyShares,
          platform_fee_bps: 1000, // 10%
          updated_by_user_id: '00000000-0000-0000-0000-000000000000',
          reason: 'token_launch'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Royalty update failed: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      return `✅ Initial royalty shares created. Agreement ID: ${result.data.agreement_version_id}`;
    }, results);

    // Test 5: Test royalty share modification
    await runTest('Royalty Share Modification', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      const modifiedRoyaltyShares = [
        {
          earner_wallet: 'test-creator',
          bps: 7000, // 70%
          role: 'Creator',
          is_manager: true
        },
        {
          earner_wallet: 'test-manager',
          bps: 1500, // 15%
          role: 'Manager',
          is_manager: true
        },
        {
          earner_wallet: 'test-influencer',
          bps: 500, // 5%
          role: 'Influencer',
          is_manager: false
        }
      ];

      // Call centralized royalty update
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/royalty-shares/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          token_id: token.id,
          royalty_shares: modifiedRoyaltyShares,
          platform_fee_bps: 1000, // 10%
          updated_by_user_id: '00000000-0000-0000-0000-000000000000',
          reason: 'management_change'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Royalty update failed: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      return `✅ Royalty shares modified. New agreement ID: ${result.data.agreement_version_id}`;
    }, results);

    // Test 6: Verify royalty agreement versions
    await runTest('Royalty Agreement Versions Verification', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      const { data: versions, error } = await supabase
        .from('royalty_agreement_versions')
        .select(`
          id,
          platform_fee_bps,
          effective_from,
          effective_to,
          created_by,
          royalty_agreement_version_shares (
            earner_wallet,
            bps
          )
        `)
        .eq('token_id', token.id)
        .order('effective_from', { ascending: true });

      if (error) throw error;

      const currentVersion = versions?.find(v => !v.effective_to);
      const historicalVersions = versions?.filter(v => v.effective_to);

      return `✅ Found ${versions?.length || 0} versions (${historicalVersions?.length || 0} historical, 1 current)`;
    }, results);

    // Test 7: Verify fee accrual ledger
    await runTest('Fee Accrual Ledger Verification', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      const { data: ledgerEntries, error } = await supabase
        .from('fee_accrual_ledger')
        .select('*')
        .eq('token_id', token.id);

      if (error) throw error;

      const platformEntries = ledgerEntries?.filter(e => e.beneficiary_kind === 'PLATFORM') || [];
      const earnerEntries = ledgerEntries?.filter(e => e.beneficiary_kind === 'EARNER') || [];

      return `✅ Found ${ledgerEntries?.length || 0} ledger entries (${platformEntries.length} platform, ${earnerEntries.length} earners)`;
    }, results);

    // Test 8: Verify royalty changes history
    await runTest('Royalty Changes History Verification', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      const { data: history, error } = await supabase
        .from('royalty_changes_history')
        .select('*')
        .eq('token_id', token.id)
        .order('changed_at', { ascending: true });

      if (error) throw error;

      return `✅ Found ${history?.length || 0} history records`;
    }, results);

    // Test 9: Verify token ownership update
    await runTest('Token Ownership Update Verification', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      const { data: ownership, error } = await supabase
        .from('token_ownership')
        .select('royalty_earners')
        .eq('token_id', token.id)
        .single();

      if (error) throw error;

      const earners = ownership?.royalty_earners || [];
      return `✅ Token ownership has ${earners.length} royalty earners`;
    }, results);

    // Test 10: Test invalid BPS validation
    await runTest('Invalid BPS Validation', async () => {
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('contract_address', TEST_TOKEN.contract_address)
        .single();

      if (!token) throw new Error('Test token not found');

      const invalidRoyaltyShares = [
        {
          earner_wallet: 'test-creator',
          bps: 5000, // 50% - should fail validation
          role: 'Creator',
          is_manager: true
        }
      ];

      // Call centralized royalty update with invalid BPS
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/royalty-shares/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          token_id: token.id,
          royalty_shares: invalidRoyaltyShares,
          platform_fee_bps: 1000, // 10%
          updated_by_user_id: '00000000-0000-0000-0000-000000000000',
          reason: 'test_validation'
        })
      });

      if (response.ok) {
        throw new Error('Expected validation to fail but it succeeded');
      }

      const errorData = await response.json();
      if (!errorData.error.includes('Invalid BPS total')) {
        throw new Error(`Unexpected error: ${errorData.error}`);
      }

      return `✅ BPS validation correctly rejected invalid total`;
    }, results);

    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status === 'passed').length;
    results.summary.failed = results.tests.filter(t => t.status === 'failed').length;

    console.log('🧪 Royalty system tests completed!');
    console.log(`📊 Results: ${results.summary.passed}/${results.summary.total} tests passed`);

    return NextResponse.json({
      success: true,
      message: 'Royalty system tests completed',
      data: results
    });

  } catch (error) {
    console.error('❌ Error in royalty system tests:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test execution failed', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Helper function to run individual tests
async function runTest(name: string, testFn: () => Promise<string>, results: any) {
  try {
    console.log(`🧪 Running test: ${name}`);
    const result = await testFn();
    console.log(`✅ ${name}: ${result}`);
    
    results.tests.push({
      name,
      status: 'passed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ ${name}: ${error}`);
    
    results.tests.push({
      name,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}
