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

// POST - Run individual royalty system tests
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: any = {};
  let testName: string = 'unknown';
  
  try {
    body = await request.json();
    testName = body.testName || 'unknown';

    console.log(`🧪 Starting individual test: ${testName}`);

    let result: any = {};

    switch (testName) {
      case 'database_tables_check':
        result = await testDatabaseTables();
        break;
      case 'test_token_creation':
        result = await testTokenCreation();
        break;
      case 'test_token_ownership_creation':
        result = await testTokenOwnershipCreation();
        break;
      case 'initial_royalty_share_creation':
        result = await testInitialRoyaltyShareCreation();
        break;
      case 'royalty_share_modification':
        result = await testRoyaltyShareModification();
        break;
      case 'royalty_agreement_versions_verification':
        result = await testRoyaltyAgreementVersionsVerification();
        break;
      case 'fee_accrual_ledger_verification':
        result = await testFeeAccrualLedgerVerification();
        break;
      case 'royalty_changes_history_verification':
        result = await testRoyaltyChangesHistoryVerification();
        break;
      case 'token_ownership_update_verification':
        result = await testTokenOwnershipUpdateVerification();
        break;
      case 'invalid_bps_validation':
        result = await testInvalidBpsValidation();
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown test: ${testName}` },
          { status: 400 }
        );
    }

    console.log(`✅ Test ${testName} completed:`, result);

    return NextResponse.json({
      success: true,
      testName,
      result
    });

  } catch (error) {
    console.error(`❌ Error in test ${testName}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        testName,
        error: 'Test execution failed', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Test 1: Check if required tables exist
async function testDatabaseTables() {
  console.log('🔍 Checking database tables...');
  
  const requiredTables = [
    'royalty_agreement_versions',
    'royalty_agreement_version_shares', 
    'royalty_changes_history',
    'fee_accrual_ledger',
    'token_ownership',
    'tokens'
  ];

  const results = [];

  for (const table of requiredTables) {
    console.log(`  📋 Checking table: ${table}`);
    const { error } = await supabase.from(table).select('id').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.log(`    ❌ Table ${table} not accessible: ${error.message}`);
      results.push({ table, status: 'error', error: error.message });
    } else {
      console.log(`    ✅ Table ${table} exists and is accessible`);
      results.push({ table, status: 'ok' });
    }
  }

  const accessibleTables = results.filter(r => r.status === 'ok').length;
  console.log(`✅ Database check complete: ${accessibleTables}/${requiredTables.length} tables accessible`);

  return {
    message: `All ${requiredTables.length} required tables exist and are accessible`,
    details: results,
    accessibleTables,
    totalTables: requiredTables.length
  };
}

// Test 2: Create test token if it doesn't exist
async function testTokenCreation() {
  console.log('🪙 Checking test token...');
  
  // Check if test token exists
  const { data: existingToken, error: checkError } = await supabase
    .from('tokens')
    .select('id, name, symbol')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.log(`❌ Error checking existing token: ${checkError.message}`);
    throw new Error(`Error checking existing token: ${checkError.message}`);
  }

  if (existingToken) {
    console.log(`✅ Test token already exists: ${existingToken.name} (${existingToken.symbol}) - ID: ${existingToken.id}`);
    return {
      message: `Test token already exists with ID: ${existingToken.id}`,
      tokenId: existingToken.id,
      tokenName: existingToken.name,
      tokenSymbol: existingToken.symbol
    };
  }

  console.log('🆕 Creating test token...');
  console.log(`  📝 Token details: ${TEST_TOKEN.name} (${TEST_TOKEN.symbol})`);

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

  if (error) {
    console.log(`❌ Error creating test token: ${error.message}`);
    throw error;
  }

  console.log(`✅ Test token created successfully: ${token.name} (${token.symbol}) - ID: ${token.id}`);

  return {
    message: `Test token created with ID: ${token.id}`,
    tokenId: token.id,
    tokenName: token.name,
    tokenSymbol: token.symbol
  };
}

// Test 3: Create test token ownership
async function testTokenOwnershipCreation() {
  console.log('👤 Checking token ownership...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Found test token: ${token.name} (ID: ${token.id})`);

  // Check if ownership exists
  const { data: existingOwnership, error: checkError } = await supabase
    .from('token_ownership')
    .select('id, current_owner')
    .eq('token_id', token.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.log(`❌ Error checking existing ownership: ${checkError.message}`);
    throw new Error(`Error checking existing ownership: ${checkError.message}`);
  }

  if (existingOwnership) {
    console.log(`✅ Token ownership already exists: ${existingOwnership.current_owner} - ID: ${existingOwnership.id}`);
    return {
      message: `Token ownership already exists with ID: ${existingOwnership.id}`,
      ownershipId: existingOwnership.id,
      currentOwner: existingOwnership.current_owner
    };
  }

  console.log('🆕 Creating token ownership...');

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

  if (error) {
    console.log(`❌ Error creating token ownership: ${error.message}`);
    throw error;
  }

  console.log(`✅ Token ownership created successfully: ${ownership.current_owner} - ID: ${ownership.id}`);

  return {
    message: `Token ownership created with ID: ${ownership.id}`,
    ownershipId: ownership.id,
    currentOwner: ownership.current_owner
  };
}

// Test 4: Test initial royalty share creation
async function testInitialRoyaltyShareCreation() {
  console.log('🎯 Testing initial royalty share creation...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Using test token: ${token.name} (ID: ${token.id})`);

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

  console.log('📊 Initial royalty shares:');
  initialRoyaltyShares.forEach(share => {
    console.log(`  • ${share.earner_wallet}: ${share.bps/100}% (${share.bps} bps) - ${share.role}`);
  });

  console.log('🔄 Calling centralized royalty update...');

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
    console.log(`❌ Royalty update failed: ${JSON.stringify(errorData)}`);
    throw new Error(`Royalty update failed: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log(`✅ Initial royalty shares created successfully`);
  console.log(`  📋 Agreement ID: ${result.data.agreement_version_id}`);
  console.log(`  📊 Updated tables: ${result.data.updated_tables.join(', ')}`);

  return {
    message: `Initial royalty shares created. Agreement ID: ${result.data.agreement_version_id}`,
    agreementId: result.data.agreement_version_id,
    updatedTables: result.data.updated_tables,
    royaltyShares: result.data.royalty_shares
  };
}

// Test 5: Test royalty share modification
async function testRoyaltyShareModification() {
  console.log('🔄 Testing royalty share modification...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Using test token: ${token.name} (ID: ${token.id})`);

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

  console.log('📊 Modified royalty shares:');
  modifiedRoyaltyShares.forEach(share => {
    console.log(`  • ${share.earner_wallet}: ${share.bps/100}% (${share.bps} bps) - ${share.role}`);
  });

  console.log('🔄 Calling centralized royalty update...');

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
    console.log(`❌ Royalty update failed: ${JSON.stringify(errorData)}`);
    throw new Error(`Royalty update failed: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log(`✅ Royalty shares modified successfully`);
  console.log(`  📋 New Agreement ID: ${result.data.agreement_version_id}`);
  console.log(`  📊 Updated tables: ${result.data.updated_tables.join(', ')}`);

  return {
    message: `Royalty shares modified. New agreement ID: ${result.data.agreement_version_id}`,
    agreementId: result.data.agreement_version_id,
    updatedTables: result.data.updated_tables,
    royaltyShares: result.data.royalty_shares
  };
}

// Test 6: Verify royalty agreement versions
async function testRoyaltyAgreementVersionsVerification() {
  console.log('📋 Verifying royalty agreement versions...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Using test token: ${token.name} (ID: ${token.id})`);

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

  if (error) {
    console.log(`❌ Error fetching versions: ${error.message}`);
    throw error;
  }

  const currentVersion = versions?.find(v => !v.effective_to);
  const historicalVersions = versions?.filter(v => v.effective_to);

  console.log(`📊 Found ${versions?.length || 0} versions:`);
  console.log(`  • Current version: ${currentVersion ? 'Yes' : 'No'}`);
  console.log(`  • Historical versions: ${historicalVersions?.length || 0}`);

  if (currentVersion) {
    console.log(`  📋 Current version ID: ${currentVersion.id}`);
    console.log(`  📅 Effective from: ${currentVersion.effective_from}`);
    console.log(`  💰 Platform fee: ${currentVersion.platform_fee_bps/100}%`);
    console.log(`  👥 Shares: ${currentVersion.royalty_agreement_version_shares?.length || 0}`);
  }

  historicalVersions?.forEach((version, index) => {
    console.log(`  📋 Historical version ${index + 1}: ${version.id}`);
    console.log(`    📅 Effective: ${version.effective_from} to ${version.effective_to}`);
    console.log(`    👥 Shares: ${version.royalty_agreement_version_shares?.length || 0}`);
  });

  return {
    message: `Found ${versions?.length || 0} versions (${historicalVersions?.length || 0} historical, 1 current)`,
    totalVersions: versions?.length || 0,
    currentVersion: currentVersion ? currentVersion.id : null,
    historicalVersions: historicalVersions?.length || 0
  };
}

// Test 7: Verify fee accrual ledger
async function testFeeAccrualLedgerVerification() {
  console.log('💰 Verifying fee accrual ledger...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Using test token: ${token.name} (ID: ${token.id})`);

  const { data: ledgerEntries, error } = await supabase
    .from('fee_accrual_ledger')
    .select('*')
    .eq('token_id', token.id);

  if (error) {
    console.log(`❌ Error fetching ledger entries: ${error.message}`);
    throw error;
  }

  const platformEntries = ledgerEntries?.filter(e => e.beneficiary_kind === 'PLATFORM') || [];
  const earnerEntries = ledgerEntries?.filter(e => e.beneficiary_kind === 'EARNER') || [];

  console.log(`📊 Found ${ledgerEntries?.length || 0} ledger entries:`);
  console.log(`  • Platform entries: ${platformEntries.length}`);
  console.log(`  • Earner entries: ${earnerEntries.length}`);

  platformEntries.forEach(entry => {
    console.log(`  💰 Platform entry: ${entry.amount_lamports} lamports`);
  });

  earnerEntries.forEach(entry => {
    console.log(`  👤 Earner entry: ${entry.beneficiary_wallet} - ${entry.amount_lamports} lamports`);
  });

  return {
    message: `Found ${ledgerEntries?.length || 0} ledger entries (${platformEntries.length} platform, ${earnerEntries.length} earners)`,
    totalEntries: ledgerEntries?.length || 0,
    platformEntries: platformEntries.length,
    earnerEntries: earnerEntries.length
  };
}

// Test 8: Verify royalty changes history
async function testRoyaltyChangesHistoryVerification() {
  console.log('📜 Verifying royalty changes history...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Using test token: ${token.name} (ID: ${token.id})`);

  const { data: history, error } = await supabase
    .from('royalty_changes_history')
    .select('*')
    .eq('token_id', token.id)
    .order('changed_at', { ascending: true });

  if (error) {
    console.log(`❌ Error fetching history: ${error.message}`);
    throw error;
  }

  console.log(`📊 Found ${history?.length || 0} history records:`);

  history?.forEach((record, index) => {
    console.log(`  📋 Record ${index + 1}:`);
    console.log(`    📅 Changed at: ${record.changed_at}`);
    console.log(`    👤 Changed by: ${record.changed_by_user_id}`);
    console.log(`    💰 Fees at change: ${record.fees_at_change}`);
    console.log(`    📝 Reason: ${record.reason || 'N/A'}`);
  });

  return {
    message: `Found ${history?.length || 0} history records`,
    totalRecords: history?.length || 0,
    records: history?.map(r => ({
      changedAt: r.changed_at,
      changedBy: r.changed_by_user_id,
      reason: r.reason
    })) || []
  };
}

// Test 9: Verify token ownership update
async function testTokenOwnershipUpdateVerification() {
  console.log('👤 Verifying token ownership update...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Using test token: ${token.name} (ID: ${token.id})`);

  const { data: ownership, error } = await supabase
    .from('token_ownership')
    .select('royalty_earners')
    .eq('token_id', token.id)
    .single();

  if (error) {
    console.log(`❌ Error fetching ownership: ${error.message}`);
    throw error;
  }

  const earners = ownership?.royalty_earners || [];

  console.log(`📊 Token ownership has ${earners.length} royalty earners:`);

  earners.forEach((earner: any, index: number) => {
    console.log(`  👤 Earner ${index + 1}:`);
    console.log(`    🏷️ Wallet: ${earner.social_or_wallet}`);
    console.log(`    📊 Percentage: ${earner.percentage}%`);
    console.log(`    🎭 Role: ${earner.role}`);
    console.log(`    👑 Manager: ${earner.is_manager ? 'Yes' : 'No'}`);
  });

  return {
    message: `Token ownership has ${earners.length} royalty earners`,
    totalEarners: earners.length,
    earners: earners.map((e: any) => ({
      wallet: e.social_or_wallet,
      percentage: e.percentage,
      role: e.role,
      isManager: e.is_manager
    }))
  };
}

// Test 10: Test invalid BPS validation
async function testInvalidBpsValidation() {
  console.log('🚫 Testing invalid BPS validation...');
  
  const { data: token } = await supabase
    .from('tokens')
    .select('id, name')
    .eq('contract_address', TEST_TOKEN.contract_address)
    .single();

  if (!token) {
    console.log('❌ Test token not found');
    throw new Error('Test token not found');
  }

  console.log(`📋 Using test token: ${token.name} (ID: ${token.id})`);

  const invalidRoyaltyShares = [
    {
      earner_wallet: 'test-creator',
      bps: 5000, // 50% - should fail validation
      role: 'Creator',
      is_manager: true
    }
  ];

  console.log('📊 Invalid royalty shares (should fail):');
  invalidRoyaltyShares.forEach(share => {
    console.log(`  • ${share.earner_wallet}: ${share.bps/100}% (${share.bps} bps) - ${share.role}`);
  });

  console.log('🔄 Calling centralized royalty update with invalid BPS...');

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
    console.log('❌ Expected validation to fail but it succeeded');
    throw new Error('Expected validation to fail but it succeeded');
  }

  const errorData = await response.json();
  console.log(`✅ BPS validation correctly rejected invalid total`);
  console.log(`  📝 Error message: ${errorData.error}`);

  if (!errorData.error.includes('Invalid BPS total')) {
    console.log(`❌ Unexpected error: ${errorData.error}`);
    throw new Error(`Unexpected error: ${errorData.error}`);
  }

  return {
    message: `BPS validation correctly rejected invalid total`,
    errorMessage: errorData.error,
    expectedBehavior: 'Validation correctly failed'
  };
}
