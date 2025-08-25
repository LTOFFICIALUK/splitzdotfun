import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting fee snapshot update job...');
    
    // Record job start
    const { data: jobRun, error: jobError } = await supabase
      .from('job_runs')
      .insert({
        job_name: 'update-fee-snapshots',
        started_at: new Date().toISOString(),
        status: 'running'
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Failed to create job run:', jobError);
      return NextResponse.json({ error: 'Failed to create job run' }, { status: 500 });
    }

    const jobRunId = jobRun.id;
    let tokensProcessed = 0;
    let snapshotsWritten = 0;
    let startTime = Date.now();

    try {
      // Get all tokens that need snapshot updates
      const { data: tokens, error: tokensError } = await supabase
        .from('tokens')
        .select('id, contract_address')
        .not('contract_address', 'is', null);

      if (tokensError) {
        throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
      }

      console.log(`📊 Processing ${tokens.length} tokens...`);

      for (const token of tokens) {
        try {
          // Get current lifetime fees from token_ownership table (this should be updated by the GitHub Action)
          const { data: ownership, error: ownershipError } = await supabase
            .from('token_ownership')
            .select('fees_generated')
            .eq('token_id', token.id)
            .single();

          if (ownershipError || !ownership) {
            console.warn(`⚠️ No ownership data for token ${token.contract_address}`);
            continue;
          }

          // Convert fees_generated from SOL to lamports
          const lifetimeFeesLamports = Math.floor((ownership.fees_generated || 0) * 1e9);

          // Get the last snapshot for this token
          const { data: lastSnapshot } = await supabase
            .from('token_fee_snapshots')
            .select('lifetime_fees_lamports_after')
            .eq('token_id', token.id)
            .order('lifetime_fees_lamports_after', { ascending: false })
            .limit(1)
            .single();

          const lastFees = lastSnapshot?.lifetime_fees_lamports_after || 0;

          // Only process if there's an increase
          if (lifetimeFeesLamports > lastFees) {
            const delta = lifetimeFeesLamports - lastFees;
            console.log(`💰 Token ${token.contract_address}: +${delta} lamports (${delta / 1e9} SOL)`);

            // Insert new snapshot
            const { data: snapshot, error: snapshotError } = await supabase
              .from('token_fee_snapshots')
              .insert({
                token_id: token.id,
                lifetime_fees_lamports_after: lifetimeFeesLamports,
                job_run_id: jobRunId,
                source_ref: `database_snapshot_${Date.now()}`
              })
              .select()
              .single();

            if (snapshotError) {
              console.error(`❌ Failed to insert snapshot for token ${token.id}:`, snapshotError);
              continue;
            }

            snapshotsWritten++;

            // Get active royalty agreement for this token
            const { data: activeAgreement } = await supabase
              .from('royalty_agreement_versions')
              .select(`
                id,
                platform_fee_bps,
                royalty_agreement_version_shares (
                  earner_wallet,
                  bps
                )
              `)
              .eq('token_id', token.id)
              .is('effective_to', null)
              .single();

            if (!activeAgreement) {
              console.warn(`⚠️ No active royalty agreement for token ${token.id}`);
              continue;
            }

            // Calculate fee distribution
            const platformBps = activeAgreement.platform_fee_bps;
            const platformDelta = Math.floor(delta * platformBps / 10000);
            const earnersDelta = delta - platformDelta;

            // Insert platform accrual
            await supabase
              .from('fee_accrual_ledger')
              .insert({
                token_id: token.id,
                entry_type: 'ACCRUAL',
                beneficiary_kind: 'PLATFORM',
                beneficiary_wallet: null,
                amount_lamports: platformDelta,
                related_snapshot_id: snapshot.id,
                agreement_version_id: activeAgreement.id
              });

            // Insert earner accruals
            for (const share of activeAgreement.royalty_agreement_version_shares) {
              const earnerDelta = Math.floor(earnersDelta * share.bps / (10000 - platformBps));
              
              await supabase
                .from('fee_accrual_ledger')
                .insert({
                  token_id: token.id,
                  entry_type: 'ACCRUAL',
                  beneficiary_kind: 'EARNER',
                  beneficiary_wallet: share.earner_wallet,
                  amount_lamports: earnerDelta,
                  related_snapshot_id: snapshot.id,
                  agreement_version_id: activeAgreement.id
                });
            }

            tokensProcessed++;
          }
        } catch (tokenError) {
          console.error(`❌ Error processing token ${token.contract_address}:`, tokenError);
          continue;
        }
      }

      // Update job run with success
      await supabase
        .from('job_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'success',
          tokens_processed: tokensProcessed,
          snapshots_written: snapshotsWritten,
          view_refresh_ms: Date.now() - startTime
        })
        .eq('id', jobRunId);

      console.log(`✅ Fee snapshot update completed successfully!`);
      console.log(`📊 Tokens processed: ${tokensProcessed}`);
      console.log(`📸 Snapshots written: ${snapshotsWritten}`);
      console.log(`⏱️ Duration: ${Date.now() - startTime}ms`);

      return NextResponse.json({
        success: true,
        tokensProcessed,
        snapshotsWritten,
        duration: Date.now() - startTime
      });

    } catch (error) {
      // Update job run with error
      await supabase
        .from('job_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', jobRunId);

      console.error('❌ Fee snapshot update failed:', error);
      return NextResponse.json(
        { error: 'Fee snapshot update failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Critical error in fee snapshot update:', error);
    return NextResponse.json(
      { error: 'Critical error in fee snapshot update' },
      { status: 500 }
    );
  }
}
