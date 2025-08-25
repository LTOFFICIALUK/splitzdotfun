import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// POST - Centralized royalty share update function
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      token_id,
      royalty_shares, // Array of { earner_wallet, bps, role, is_manager }
      platform_fee_bps = 1000, // Default 10%
      updated_by_user_id,
      reason = 'manual_update' // 'token_launch', 'management_change', 'ownership_transfer', 'manual_update'
    } = body;

    if (!token_id) {
      return NextResponse.json(
        { success: false, error: 'Token ID is required' },
        { status: 400 }
      );
    }

    if (!royalty_shares || !Array.isArray(royalty_shares) || royalty_shares.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Royalty shares array is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Starting centralized royalty share update for token:', token_id);
    console.log('📊 New royalty shares:', royalty_shares);
    console.log('💰 Platform fee BPS:', platform_fee_bps);

    // Validate total BPS equals 10000 - platform_fee_bps
    const totalBps = royalty_shares.reduce((sum, share) => sum + share.bps, 0);
    const expectedTotal = 10000 - platform_fee_bps;
    
    console.log('📊 BPS Validation:');
    console.log('  - Total BPS from shares:', totalBps);
    console.log('  - Expected total (10000 - platform_fee_bps):', expectedTotal);
    console.log('  - Platform fee BPS:', platform_fee_bps);
    console.log('  - Validation:', totalBps === expectedTotal ? '✅ PASS' : '❌ FAIL');
    
    if (totalBps !== expectedTotal) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid BPS total: ${totalBps} (shares) vs ${expectedTotal} (required = 10000 - platform ${platform_fee_bps})` 
        },
        { status: 400 }
      );
    }

    // 1. Get current royalty agreement (if exists)
    console.log('🔍 Fetching current royalty agreement...');
    
    const { data: currentAgreement, error: currentError } = await supabase
      .from('royalty_agreement_versions')
      .select(`
        id,
        platform_fee_bps,
        royalty_agreement_version_shares (
          earner_wallet,
          bps
        )
      `)
      .eq('token_id', token_id)
      .is('effective_to', null)
      .single();

    if (currentError && currentError.code !== 'PGRST116') {
      console.error('❌ Error fetching current agreement:', currentError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current royalty agreement' },
        { status: 500 }
      );
    }

    // 2. Close current agreement (if exists)
    if (currentAgreement) {
      console.log('🔒 Closing current royalty agreement...');
      
      const { error: closeError } = await supabase
        .from('royalty_agreement_versions')
        .update({
          effective_to: new Date().toISOString()
        })
        .eq('id', currentAgreement.id);

      if (closeError) {
        console.error('❌ Error closing current agreement:', closeError);
        return NextResponse.json(
          { success: false, error: 'Failed to close current royalty agreement' },
          { status: 500 }
        );
      }
    }

    // 3. Create new royalty agreement version
    console.log('🆕 Creating new royalty agreement version...');
    
    const { data: newAgreement, error: newAgreementError } = await supabase
      .from('royalty_agreement_versions')
      .insert({
        token_id,
        platform_fee_bps,
        effective_from: new Date().toISOString(),
        created_by: updated_by_user_id
      })
      .select()
      .single();

    if (newAgreementError) {
      console.error('❌ Error creating new agreement:', newAgreementError);
      return NextResponse.json(
        { success: false, error: 'Failed to create new royalty agreement' },
        { status: 500 }
      );
    }

    // 4. Create royalty share records
    console.log('👥 Creating royalty share records...');
    console.log('📊 Royalty shares to create:', royalty_shares);
    
    const shareRecords = royalty_shares.map(share => ({
      agreement_version_id: newAgreement.id,
      earner_wallet: share.earner_wallet,
      bps: share.bps
    }));

    console.log('📝 Share records prepared:', shareRecords);

    const { data: createdShares, error: sharesError } = await supabase
      .from('royalty_agreement_version_shares')
      .insert(shareRecords)
      .select();

    if (sharesError) {
      console.error('❌ Error creating royalty shares:', sharesError);
      return NextResponse.json(
        { success: false, error: 'Failed to create royalty share records', details: sharesError },
        { status: 500 }
      );
    } else {
      console.log('✅ Royalty shares created successfully:', createdShares?.length, 'shares');
      console.log('📋 Created shares:', createdShares);
    }

    // 5. Update token_ownership table (for backward compatibility)
    console.log('🔄 Updating token_ownership for backward compatibility...');
    
    const royaltyEarnersForOwnership = royalty_shares.map(share => ({
      wallet: share.earner_wallet.includes(':') ? null : share.earner_wallet,
      social_platform: share.earner_wallet.includes(':') ? share.earner_wallet.split(':')[0] : null,
      social_handle: share.earner_wallet.includes(':') ? share.earner_wallet.split(':')[1] : null,
      social_or_wallet: share.earner_wallet,
      role: share.role || 'Earner',
      percentage: share.bps / 100, // Convert BPS to percentage
      is_manager: share.is_manager || false
    }));

    const { error: ownershipError } = await supabase
      .from('token_ownership')
      .update({
        royalty_earners: royaltyEarnersForOwnership,
        updated_at: new Date().toISOString()
      })
      .eq('token_id', token_id);

    if (ownershipError) {
      console.error('❌ Error updating token_ownership:', ownershipError);
      // Don't fail the request, just log the error
    }

    // 6. Update tokens table (if it has royalty-related fields)
    console.log('🔄 Updating tokens table...');
    
    const { error: tokensError } = await supabase
      .from('tokens')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', token_id);

    if (tokensError) {
      console.error('❌ Error updating tokens table:', tokensError);
      // Don't fail the request, just log the error
    }

    // 7. Record the change in history
    console.log('📝 Recording royalty change in history...');
    
    const { error: historyError } = await supabase
      .from('royalty_changes_history')
      .insert({
        token_id,
        previous_royalty_earners: currentAgreement ? currentAgreement.royalty_agreement_version_shares : null,
        new_royalty_earners: royaltyEarnersForOwnership,
        changed_by_user_id: updated_by_user_id,
        fees_at_change: 0 // Could be enhanced to get current fees
        // Removed 'reason' field as it doesn't exist in the table
      });

    if (historyError) {
      console.error('❌ Error recording royalty change history:', historyError);
      // Don't fail the request, just log the error
    } else {
      console.log('✅ Royalty change history recorded successfully');
    }

    // 8. Initialize or update fee accrual ledger entries
    console.log('💰 Initializing/updating fee accrual ledger entries...');
    
    // Get current fee accrual entries for this token
    const { data: currentLedgerEntries, error: ledgerError } = await supabase
      .from('fee_accrual_ledger')
      .select('*')
      .eq('token_id', token_id);

    if (ledgerError) {
      console.error('❌ Error fetching current ledger entries:', ledgerError);
    } else {
      if (!currentLedgerEntries || currentLedgerEntries.length === 0) {
        // Initialize fee accrual ledger entries for new token
        console.log('💰 Initializing fee accrual ledger for new token...');
        
        const ledgerEntries = [
          // Platform entry
          {
            token_id,
            entry_type: 'ACCRUAL',
            beneficiary_kind: 'PLATFORM',
            beneficiary_wallet: 'platform',
            amount_lamports: 0,
            agreement_version_id: newAgreement.id
          },
          // Earner entries
          ...royalty_shares.map(share => ({
            token_id,
            entry_type: 'ACCRUAL',
            beneficiary_kind: 'EARNER',
            beneficiary_wallet: share.earner_wallet,
            amount_lamports: 0,
            agreement_version_id: newAgreement.id
          }))
        ];

        const { error: initLedgerError } = await supabase
          .from('fee_accrual_ledger')
          .insert(ledgerEntries);

        if (initLedgerError) {
          console.error('❌ Error initializing fee accrual ledger:', initLedgerError);
        } else {
          console.log('✅ Fee accrual ledger initialized for', ledgerEntries.length, 'entries');
        }
      } else {
        // Update existing entries to reference new agreement version
        const { error: updateLedgerError } = await supabase
          .from('fee_accrual_ledger')
          .update({
            agreement_version_id: newAgreement.id
          })
          .eq('token_id', token_id)
          .is('agreement_version_id', null);

        if (updateLedgerError) {
          console.error('❌ Error updating ledger entries:', updateLedgerError);
        } else {
          console.log('✅ Fee accrual ledger entries updated with new agreement version');
        }
      }
    }

    // 9. Update marketplace listings (if any active listings exist)
    console.log('🔄 Updating marketplace listings...');
    
    const { data: activeListings, error: listingsError } = await supabase
      .from('marketplace_listings')
      .select('id, proposed_fee_splits')
      .eq('token_id', token_id)
      .eq('is_active', true);

    if (listingsError) {
      console.error('❌ Error fetching active listings:', listingsError);
    } else if (activeListings && activeListings.length > 0) {
      // Update proposed fee splits in active listings
      const updatedFeeSplits = royalty_shares.map(share => ({
        earner_wallet: share.earner_wallet,
        percentage: share.bps / 100,
        role: share.role || 'Earner',
        is_manager: share.is_manager || false
      }));

      for (const listing of activeListings) {
        const { error: updateListingError } = await supabase
          .from('marketplace_listings')
          .update({
            proposed_fee_splits: updatedFeeSplits,
            updated_at: new Date().toISOString()
          })
          .eq('id', listing.id);

        if (updateListingError) {
          console.error(`❌ Error updating listing ${listing.id}:`, updateListingError);
        }
      }
    }

    // 10. Update royalty leaderboard (if needed)
    console.log('🏆 Updating royalty leaderboard...');
    
    // This could trigger a background job to recalculate leaderboard
    // For now, we'll just log that it should be updated
    console.log('📊 Royalty leaderboard should be recalculated for this token');

    console.log('✅ Centralized royalty share update completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Royalty shares updated successfully across all tables',
      data: {
        agreement_version_id: newAgreement.id,
        platform_fee_bps,
        royalty_shares: royalty_shares.map(share => ({
          earner_wallet: share.earner_wallet,
          bps: share.bps,
          percentage: share.bps / 100,
          role: share.role || 'Earner',
          is_manager: share.is_manager || false
        })),
        effective_from: newAgreement.effective_from,
        updated_tables: [
          'royalty_agreement_versions',
          'royalty_agreement_version_shares', 
          'token_ownership',
          'tokens',
          'royalty_changes_history',
          'fee_accrual_ledger',
          'marketplace_listings'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Centralized royalty share update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
