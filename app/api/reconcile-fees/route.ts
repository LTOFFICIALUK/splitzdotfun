import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_req: NextRequest) {
  try {
    // Fetch lifetime totals per token from snapshots
    const { data: lifetimeRows, error: lifetimeErr } = await supabase
      .from('token_fee_snapshots')
      .select('token_id, lifetime_fees_lamports_after')
      .order('lifetime_fees_lamports_after', { ascending: false });

    if (lifetimeErr) {
      return NextResponse.json({ success: false, error: 'Failed to read snapshots' }, { status: 500 });
    }

    // Reduce to latest lifetime per token
    const latestLifetimeByToken = new Map<string, number>();
    for (const row of lifetimeRows || []) {
      if (!latestLifetimeByToken.has(row.token_id)) {
        latestLifetimeByToken.set(row.token_id, row.lifetime_fees_lamports_after);
      }
    }

    // Aggregates from ledger per token
    const { data: ledgerAgg, error: ledgerErr } = await supabase
      .from('fee_accrual_ledger')
      .select('token_id, entry_type, beneficiary_kind, amount_lamports');

    if (ledgerErr) {
      return NextResponse.json({ success: false, error: 'Failed to read ledger' }, { status: 500 });
    }

    type Totals = {
      platformAccrual: number;
      earnersAccrual: number;
      claimedFromBags: number;
      payouts: number;
      platformWithdrawals: number;
    };

    const totalsByToken = new Map<string, Totals>();

    for (const row of ledgerAgg || []) {
      const t = totalsByToken.get(row.token_id) || {
        platformAccrual: 0,
        earnersAccrual: 0,
        claimedFromBags: 0,
        payouts: 0,
        platformWithdrawals: 0,
      };
      if (row.entry_type === 'ACCRUAL' && row.beneficiary_kind === 'PLATFORM') t.platformAccrual += row.amount_lamports;
      if (row.entry_type === 'ACCRUAL' && row.beneficiary_kind === 'EARNER') t.earnersAccrual += row.amount_lamports;
      if (row.entry_type === 'CLAIM_FROM_BAGS') t.claimedFromBags += row.amount_lamports;
      if (row.entry_type === 'PAYOUT_TO_EARNER') t.payouts += row.amount_lamports;
      if (row.entry_type === 'PLATFORM_WITHDRAWAL') t.platformWithdrawals += row.amount_lamports;
      totalsByToken.set(row.token_id, t);
    }

    // Fetch computed views for cross-check
    const { data: tokenBalances, error: tbErr } = await supabase
      .from('token_balances_v')
      .select('*');

    if (tbErr) {
      return NextResponse.json({ success: false, error: 'Failed to read token_balances_v' }, { status: 500 });
    }

    // Build report per token
    const reports: any[] = [];
    let hasFailures = false;

    const tokenIds = Array.from(new Set<string>([
      ...Array.from(latestLifetimeByToken.keys()),
      ...Array.from(totalsByToken.keys()),
      ...((tokenBalances || []).map(r => r.token_id)),
    ]));

    for (const tokenId of tokenIds) {
      const lifetime = latestLifetimeByToken.get(tokenId) || 0;
      const t = totalsByToken.get(tokenId) || {
        platformAccrual: 0,
        earnersAccrual: 0,
        claimedFromBags: 0,
        payouts: 0,
        platformWithdrawals: 0,
      };
      const view = (tokenBalances || []).find(r => r.token_id === tokenId) || null;

      const sumAccrual = t.platformAccrual + t.earnersAccrual;
      const treasuryFromView = view ? view.treasury_liquid_balance_lamports : 0;

      // Invariants
      const invAccrualEqLifetime = sumAccrual === lifetime;
      const invTreasuryNonNegative = (treasuryFromView ?? 0) >= 0;

      // owed >= 0 per earner can be checked via view
      const { data: earnerRows } = await supabase
        .from('earner_token_balances_v')
        .select('owed_total_lamports')
        .eq('token_id', tokenId);
      const invOwedNonNegative = (earnerRows || []).every(r => (r.owed_total_lamports ?? 0) >= 0);

      const tokenReport = {
        token_id: tokenId,
        lifetime_total_lamports: lifetime,
        ledger: {
          platform_accrual_lamports: t.platformAccrual,
          earners_accrual_lamports: t.earnersAccrual,
          claimed_from_bags_lamports: t.claimedFromBags,
          payouts_lamports: t.payouts,
          platform_withdrawals_lamports: t.platformWithdrawals,
        },
        views: view || {},
        invariants: {
          accrual_equals_lifetime: invAccrualEqLifetime,
          owed_non_negative: invOwedNonNegative,
          treasury_non_negative: invTreasuryNonNegative,
        },
      };

      if (!invAccrualEqLifetime || !invOwedNonNegative || !invTreasuryNonNegative) {
        hasFailures = true;
      }

      reports.push(tokenReport);
    }

    return NextResponse.json({ success: true, has_failures: hasFailures, reports });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
