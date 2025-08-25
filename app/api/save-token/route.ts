import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateTokenData, CreateTokenOwnershipData, RoyaltyEarner } from '@/types/tokens';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    const {
      deployer_user_id,
      deployer_social_or_wallet,
      name,
      symbol,
      description,
      contract_address,
      social_link,
      image_url,
      banner_url,
      metadata_url,
      royalty_earners
    } = body;

    // Validate required fields
    if (!deployer_social_or_wallet || !name || !symbol || !contract_address || !metadata_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create token link
    const token_link = `https://splitz.fun/token/${contract_address}`;

    // Prepare token data
    const tokenData: CreateTokenData = {
      deployer_user_id,
      deployer_social_or_wallet,
      name,
      symbol,
      description,
      contract_address,
      token_link,
      social_link,
      image_url,
      banner_url,
      metadata_url
    };

    console.log('💾 Saving token to database:', tokenData);

    // Insert token
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .insert(tokenData)
      .select()
      .single();

    if (tokenError) {
      console.error('❌ Error saving token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to save token', details: tokenError },
        { status: 500 }
      );
    }

    console.log('✅ Token saved successfully:', token.id);

    // Prepare ownership data
    const ownershipData: CreateTokenOwnershipData = {
      token_id: token.id,
      deployer_user_id,
      current_owner: deployer_social_or_wallet,
      current_owner_user_id: deployer_user_id,
      royalty_earners: royalty_earners || [],
      total_fees_earned: 0,
      fees_owed_per_earner: {},
      fees_claimed_per_earner: {},
      total_fees_claimed: 0
    };

    console.log('💾 Saving token ownership:', ownershipData);

    // Insert token ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from('token_ownership')
      .insert(ownershipData)
      .select()
      .single();

    if (ownershipError) {
      console.error('❌ Error saving token ownership:', ownershipError);
      return NextResponse.json(
        { error: 'Failed to save token ownership', details: ownershipError },
        { status: 500 }
      );
    }

    console.log('✅ Token ownership saved successfully:', ownership.id);

    // Create royalty agreement version
    console.log('📋 Creating royalty agreement version...');
    
    const platformFeeBps = 1000; // 10% platform fee (1000 basis points)
    
    const { data: royaltyAgreement, error: agreementError } = await supabase
      .from('royalty_agreement_versions')
      .insert({
        token_id: token.id,
        platform_fee_bps: platformFeeBps,
        effective_from: new Date().toISOString(),
        created_by: deployer_user_id
      })
      .select()
      .single();

    if (agreementError) {
      console.error('❌ Error creating royalty agreement:', agreementError);
      return NextResponse.json(
        { error: 'Failed to create royalty agreement', details: agreementError },
        { status: 500 }
      );
    }

    console.log('✅ Royalty agreement created successfully:', royaltyAgreement.id);

    // Create royalty shares for each earner
    console.log('👥 Creating royalty shares for earners...');
    
    if (royalty_earners && royalty_earners.length > 0) {
      const shareRecords = royalty_earners.map((earner: any) => {
        // Convert percentage to basis points (1% = 100 bps)
        const bps = Math.round(earner.percentage * 100);
        
        // Determine the wallet/identifier to use
        let earnerWallet = '';
        if (earner.wallet) {
          earnerWallet = earner.wallet;
        } else if (earner.social_platform && earner.social_handle) {
          earnerWallet = `${earner.social_platform}:${earner.social_handle}`;
        } else {
          earnerWallet = earner.social_or_wallet || '';
        }

        console.log('📝 Creating share for earner:', {
          wallet: earner.wallet,
          social_platform: earner.social_platform,
          social_handle: earner.social_handle,
          social_or_wallet: earner.social_or_wallet,
          role: earner.role,
          percentage: earner.percentage,
          is_manager: earner.is_manager,
          earner_wallet: earnerWallet,
          bps: bps
        });

        return {
          agreement_version_id: royaltyAgreement.id,
          earner_wallet: earnerWallet,
          bps: bps
        };
      });

      const { error: sharesError } = await supabase
        .from('royalty_agreement_version_shares')
        .insert(shareRecords);

      if (sharesError) {
        console.error('❌ Error creating royalty shares:', sharesError);
        return NextResponse.json(
          { error: 'Failed to create royalty shares', details: sharesError },
          { status: 500 }
        );
      }

      console.log('✅ Royalty shares created successfully for', shareRecords.length, 'earners');
    }

    // Record the royalty change in history
    console.log('📝 Recording royalty change in history...');
    
    const { error: historyError } = await supabase
      .from('royalty_changes_history')
      .insert({
        token_id: token.id,
        previous_royalty_earners: null, // First time setup
        new_royalty_earners: royalty_earners || [],
        changed_by_user_id: deployer_user_id,
        fees_at_change: 0
      });

    if (historyError) {
      console.error('❌ Error recording royalty change history:', historyError);
      // Don't fail the entire request for this
    } else {
      console.log('✅ Royalty change history recorded');
    }

    // Initialize fee accrual ledger entries for each earner
    console.log('💰 Initializing fee accrual ledger...');
    
    if (royalty_earners && royalty_earners.length > 0) {
      const ledgerEntries = royalty_earners.map((earner: any) => {
        let earnerWallet = '';
        if (earner.wallet) {
          earnerWallet = earner.wallet;
        } else if (earner.social_platform && earner.social_handle) {
          earnerWallet = `${earner.social_platform}:${earner.social_handle}`;
        } else {
          earnerWallet = earner.social_or_wallet || '';
        }

        console.log('💰 Creating ledger entry for earner:', {
          wallet: earner.wallet,
          social_platform: earner.social_platform,
          social_handle: earner.social_handle,
          social_or_wallet: earner.social_or_wallet,
          role: earner.role,
          percentage: earner.percentage,
          is_manager: earner.is_manager,
          earner_wallet: earnerWallet
        });

        return {
          token_id: token.id,
          entry_type: 'ACCRUAL',
          beneficiary_kind: 'EARNER',
          beneficiary_wallet: earnerWallet,
          amount_lamports: 0, // Initial amount is 0
          agreement_version_id: royaltyAgreement.id
        };
      });

      const { error: ledgerError } = await supabase
        .from('fee_accrual_ledger')
        .insert(ledgerEntries);

      if (ledgerError) {
        console.error('❌ Error initializing fee accrual ledger:', ledgerError);
        // Don't fail the entire request for this
      } else {
        console.log('✅ Fee accrual ledger initialized for', ledgerEntries.length, 'earners');
      }
    }

    // Add platform fee accrual entry
    const { error: platformLedgerError } = await supabase
      .from('fee_accrual_ledger')
      .insert({
        token_id: token.id,
        entry_type: 'ACCRUAL',
        beneficiary_kind: 'PLATFORM',
        beneficiary_wallet: null,
        amount_lamports: 0, // Initial amount is 0
        agreement_version_id: royaltyAgreement.id
      });

    if (platformLedgerError) {
      console.error('❌ Error initializing platform fee accrual:', platformLedgerError);
      // Don't fail the entire request for this
    } else {
      console.log('✅ Platform fee accrual initialized');
    }

    return NextResponse.json({
      success: true,
      token,
      ownership,
      royalty_agreement: royaltyAgreement,
      message: 'Token, ownership, and royalty agreement data saved successfully'
    });

  } catch (error) {
    console.error('❌ Error in save-token API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
