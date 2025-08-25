import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('token_id');

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: 'token_id parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching royalty shares for token: ${tokenId}`);

    // Get current active royalty agreement
    const { data: currentAgreement, error: agreementError } = await supabase
      .from('royalty_agreement_versions')
      .select(`
        id,
        platform_fee_bps,
        effective_from,
        created_by,
        royalty_agreement_version_shares (
          earner_wallet,
          bps
        )
      `)
      .eq('token_id', tokenId)
      .is('effective_to', null)
      .single();

    if (agreementError && agreementError.code !== 'PGRST116') {
      console.error('❌ Error fetching royalty agreement:', agreementError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch royalty agreement', details: agreementError },
        { status: 500 }
      );
    }

    // Get token info
    const { data: tokenInfo, error: tokenError } = await supabase
      .from('tokens')
      .select('name, symbol, contract_address')
      .eq('id', tokenId)
      .single();

    if (tokenError) {
      console.error('❌ Error fetching token info:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch token info', details: tokenError },
        { status: 500 }
      );
    }

    // Get all historical versions for audit trail
    const { data: historicalVersions, error: historyError } = await supabase
      .from('royalty_agreement_versions')
      .select(`
        id,
        platform_fee_bps,
        effective_from,
        effective_to,
        created_by,
        created_at,
        royalty_agreement_version_shares (
          earner_wallet,
          bps
        )
      `)
      .eq('token_id', tokenId)
      .order('effective_from', { ascending: false });

    if (historyError) {
      console.error('❌ Error fetching historical versions:', historyError);
      // Don't fail the request, just log the error
    }

    // Format the response
    const response = {
      success: true,
      data: {
        token: {
          id: tokenId,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          contract_address: tokenInfo.contract_address
        },
        current_agreement: currentAgreement ? {
          id: currentAgreement.id,
          platform_fee_bps: currentAgreement.platform_fee_bps,
          platform_fee_percentage: currentAgreement.platform_fee_bps / 100,
          effective_from: currentAgreement.effective_from,
          created_by: currentAgreement.created_by,
          royalty_shares: currentAgreement.royalty_agreement_version_shares?.map(share => ({
            earner_wallet: share.earner_wallet,
            bps: share.bps,
            percentage: share.bps / 100
          })) || []
        } : null,
        historical_versions: historicalVersions?.map(version => ({
          id: version.id,
          platform_fee_bps: version.platform_fee_bps,
          platform_fee_percentage: version.platform_fee_bps / 100,
          effective_from: version.effective_from,
          effective_to: version.effective_to,
          created_by: version.created_by,
          created_at: version.created_at,
                      royalty_shares: version.royalty_agreement_version_shares?.map(share => ({
              earner_wallet: share.earner_wallet,
              bps: share.bps,
              percentage: share.bps / 100
            })) || []
        })) || []
      }
    };

    console.log(`✅ Found ${response.data.current_agreement?.royalty_shares?.length || 0} current royalty shares`);
    console.log(`📚 Found ${response.data.historical_versions?.length || 0} historical versions`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in royalty-shares API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
