import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RoyaltyShare {
  earner_wallet: string;
  bps: number; // Basis points (10000 = 100%)
}

interface UpdateRoyaltySharesRequest {
  token_id: string;
  platform_fee_bps: number; // Platform fee in basis points (e.g., 2000 = 20%)
  royalty_shares: RoyaltyShare[];
  updated_by_user_id?: string;
  reason?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔄 Processing royalty share update request...');
    
    const body: UpdateRoyaltySharesRequest = await request.json();
    const { token_id, platform_fee_bps, royalty_shares, updated_by_user_id, reason } = body;

    // Validate required fields
    if (!token_id || platform_fee_bps === undefined || !royalty_shares) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: token_id, platform_fee_bps, royalty_shares' },
        { status: 400 }
      );
    }

    // Validate platform fee
    if (platform_fee_bps < 0 || platform_fee_bps > 10000) {
      return NextResponse.json(
        { success: false, error: 'Platform fee must be between 0 and 10000 basis points (0-100%)' },
        { status: 400 }
      );
    }

    // Validate royalty shares
    if (!Array.isArray(royalty_shares) || royalty_shares.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Royalty shares must be a non-empty array' },
        { status: 400 }
      );
    }

    // Calculate total earner bps
    const totalEarnerBps = royalty_shares.reduce((sum, share) => sum + share.bps, 0);
    const expectedEarnerBps = 10000 - platform_fee_bps;

    if (totalEarnerBps !== expectedEarnerBps) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid royalty shares total: ${totalEarnerBps} bps (earners) vs ${expectedEarnerBps} bps (required = 10000 - platform ${platform_fee_bps})` 
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Validating royalty share update for token ${token_id}`);
    console.log(`📊 Platform fee: ${platform_fee_bps} bps (${platform_fee_bps/100}%)`);
    console.log(`👥 Total earner shares: ${totalEarnerBps} bps (${totalEarnerBps/100}%)`);

    // 1. Get current active royalty agreement
    const { data: currentAgreement, error: currentError } = await supabase
      .from('royalty_agreement_versions')
      .select(`
        id,
        platform_fee_bps,
        effective_from,
        royalty_agreement_version_shares (
          earner_wallet,
          bps,
          role
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

    // 2. Check if there are any changes
    if (currentAgreement) {
      const currentPlatformBps = currentAgreement.platform_fee_bps;
      const currentShares = currentAgreement.royalty_agreement_version_shares || [];
      
      // Check if platform fee changed
      const platformFeeChanged = currentPlatformBps !== platform_fee_bps;
      
      // Check if shares changed
      const sharesChanged = royalty_shares.length !== currentShares.length ||
        royalty_shares.some(newShare => {
          const currentShare = currentShares.find(cs => cs.earner_wallet === newShare.earner_wallet);
          return !currentShare || currentShare.bps !== newShare.bps;
        });

      if (!platformFeeChanged && !sharesChanged) {
        return NextResponse.json(
          { success: false, error: 'No changes detected in royalty shares' },
          { status: 400 }
        );
      }
    }

    // 3. Create boundary snapshot (force a snapshot before changes)
    console.log('📸 Creating boundary snapshot before royalty share changes...');
    
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('token_fee_snapshots')
      .select('lifetime_fees_lamports_after')
      .eq('token_id', token_id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError && snapshotError.code !== 'PGRST116') {
      console.error('❌ Error fetching latest snapshot:', snapshotError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch latest fee snapshot' },
        { status: 500 }
      );
    }

    // If no snapshot exists, we need to create one
    if (snapshotError && snapshotError.code === 'PGRST116') {
      console.log('⚠️ No existing snapshots found, creating initial snapshot...');
      
      // Create a job run for the boundary snapshot
      const { data: jobRun, error: jobRunError } = await supabase
        .from('job_runs')
        .insert({
          job_name: 'boundary-snapshot',
          status: 'running'
        })
        .select()
        .single();

      if (jobRunError) {
        console.error('❌ Error creating job run:', jobRunError);
        return NextResponse.json(
          { success: false, error: 'Failed to create boundary snapshot' },
          { status: 500 }
        );
      }

      // Create initial snapshot with 0 fees
      const { error: initialSnapshotError } = await supabase
        .from('token_fee_snapshots')
        .insert({
          token_id,
          lifetime_fees_lamports_after: 0,
          job_run_id: jobRun.id,
          source_ref: 'boundary-snapshot'
        });

      if (initialSnapshotError) {
        console.error('❌ Error creating initial snapshot:', initialSnapshotError);
        return NextResponse.json(
          { success: false, error: 'Failed to create boundary snapshot' },
          { status: 500 }
        );
      }

      // Update job run
      await supabase
        .from('job_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString()
        })
        .eq('id', jobRun.id);
    }

    // 4. Close current agreement (if exists)
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

    // 5. Create new royalty agreement version
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

    // 6. Create royalty share records
    console.log('👥 Creating royalty share records...');
    
    const shareRecords = royalty_shares.map(share => ({
      agreement_version_id: newAgreement.id,
      earner_wallet: share.earner_wallet,
      bps: share.bps
    }));

    const { error: sharesError } = await supabase
      .from('royalty_agreement_version_shares')
      .insert(shareRecords);

    if (sharesError) {
      console.error('❌ Error creating royalty shares:', sharesError);
      return NextResponse.json(
        { success: false, error: 'Failed to create royalty share records' },
        { status: 500 }
      );
    }

    // 7. Update token_ownership table for backward compatibility
    console.log('🔄 Updating token_ownership for backward compatibility...');
    
    const royaltyEarnersForOwnership = royalty_shares.map(share => ({
      social_or_wallet: share.earner_wallet,
      role: 'Earner',
      percentage: share.bps / 100 // Convert bps to percentage
    }));

    const { error: ownershipError } = await supabase
      .from('token_ownership')
      .update({
        royalty_earners: royaltyEarnersForOwnership
      })
      .eq('token_id', token_id);

    if (ownershipError) {
      console.error('❌ Error updating token_ownership:', ownershipError);
      // Don't fail the request, just log the error
    }

    console.log('✅ Royalty share update completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Royalty shares updated successfully',
      data: {
        agreement_version_id: newAgreement.id,
        platform_fee_bps,
        royalty_shares: royalty_shares.map(share => ({
          earner_wallet: share.earner_wallet,
          bps: share.bps,
          percentage: share.bps / 100
        })),
        effective_from: newAgreement.effective_from,
        boundary_snapshot_created: true
      }
    });

  } catch (error) {
    console.error('❌ Royalty share update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
