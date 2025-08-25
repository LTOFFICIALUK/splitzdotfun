import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY!;
const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PayoutRequest {
  token_id: string;
  earner_wallet: string;
  claim_reason?: string;
  claimer_user_id?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('💰 Processing royalty payout request...');
    
    const body: PayoutRequest = await request.json();
    const { token_id, earner_wallet, claim_reason, claimer_user_id } = body;

    // Validate required fields
    if (!token_id || !earner_wallet) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: token_id, earner_wallet' },
        { status: 400 }
      );
    }

    console.log(`🔍 Validating payout for token ${token_id}, earner ${earner_wallet}`);

    // 1. Get current balances from views
    const { data: earnerBalance, error: balanceError } = await supabase
      .from('earner_token_balances_v')
      .select('*')
      .eq('token_id', token_id)
      .eq('earner_wallet', earner_wallet)
      .single();

    if (balanceError || !earnerBalance) {
      console.error('❌ Error fetching earner balance:', balanceError);
      return NextResponse.json(
        { success: false, error: 'Please try again later' },
        { status: 404 }
      );
    }

    const { data: tokenBalance, error: tokenBalanceError } = await supabase
      .from('token_balances_v')
      .select('*')
      .eq('token_id', token_id)
      .single();

    if (tokenBalanceError || !tokenBalance) {
      console.error('❌ Error fetching token balance:', tokenBalanceError);
      return NextResponse.json(
        { success: false, error: 'Token balance not found' },
        { status: 404 }
      );
    }

    // 2. Always pay the full amount owed
    const payoutAmountLamports = earnerBalance.owed_total_lamports;
    
    if (payoutAmountLamports <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please try again later' },
        { status: 400 }
      );
    }

    // 3. Validate payout amount doesn't exceed owed amount
    if (payoutAmountLamports > earnerBalance.owed_total_lamports) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payout amount exceeds owed amount',
          details: {
            requested: payoutAmountLamports,
            owed: earnerBalance.owed_total_lamports,
            available: earnerBalance.owed_total_lamports
          }
        },
        { status: 400 }
      );
    }

    // 4. Validate treasury has sufficient balance
    if (payoutAmountLamports > tokenBalance.treasury_liquid_balance_lamports) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient treasury balance',
          details: {
            requested: payoutAmountLamports,
            treasury_balance: tokenBalance.treasury_liquid_balance_lamports
          }
        },
        { status: 400 }
      );
    }

    console.log(`✅ Validation passed. Owed: ${earnerBalance.owed_total_lamports}, Treasury: ${tokenBalance.treasury_liquid_balance_lamports}, Payout: ${payoutAmountLamports}`);

    // 4. Get token and ownership info for recording
    const { data: tokenInfo, error: tokenError } = await supabase
      .from('tokens')
      .select('name, symbol, contract_address')
      .eq('id', token_id)
      .single();

    if (tokenError || !tokenInfo) {
      console.error('❌ Error fetching token info:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    const { data: ownershipInfo, error: ownershipError } = await supabase
      .from('token_ownership')
      .select('id, royalty_earners')
      .eq('token_id', token_id)
      .single();

    if (ownershipError || !ownershipInfo) {
      console.error('❌ Error fetching ownership info:', ownershipError);
      return NextResponse.json(
        { success: false, error: 'Token ownership not found' },
        { status: 404 }
      );
    }

    // 5. Find royalty earner info from royalty_earners array
    const royaltyEarners = ownershipInfo.royalty_earners;
    let royaltyEarnerInfo = null;
    let royaltyRole = '';
    let royaltyPercentage = 0;

    if (Array.isArray(royaltyEarners)) {
      royaltyEarnerInfo = royaltyEarners.find(earner => 
        earner.social_or_wallet === earner_wallet || 
        earner.wallet === earner_wallet
      );
      
      if (royaltyEarnerInfo) {
        royaltyRole = royaltyEarnerInfo.role || 'Earner';
        royaltyPercentage = royaltyEarnerInfo.percentage || 0;
      }
    }

    // 6. Initialize Solana connection and treasury keypair
    const connection = new Connection(solanaRpcUrl, 'confirmed');
    const treasuryKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(treasuryPrivateKey))
    );

    console.log(`🔗 Treasury wallet: ${treasuryKeypair.publicKey.toString()}`);
    console.log(`🎯 Sending ${payoutAmountLamports} lamports to ${earner_wallet}`);

    // 7. Create and send transaction
    const transaction = new Transaction();
    
    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: new PublicKey(earner_wallet),
        lamports: payoutAmountLamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;

    // Sign and send transaction
    transaction.sign(treasuryKeypair);
    
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log(`📝 Transaction sent: ${signature}`);

    // 8. Record in royalty_payouts table
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('royalty_payouts')
      .insert({
        token_id,
        token_ownership_id: ownershipInfo.id,
        claimer_user_id,
        claimer_wallet_address: treasuryKeypair.publicKey.toString(),
        royalty_earner_social_or_wallet: earner_wallet,
        royalty_role: royaltyRole,
        royalty_percentage: royaltyPercentage,
        payout_amount: payoutAmountLamports / LAMPORTS_PER_SOL,
        transaction_signature: signature,
        transaction_status: 'pending',
        claim_reason: claim_reason || 'Manual payout',
        payout_method: 'wallet',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (payoutError) {
      console.error('❌ Error recording payout:', payoutError);
      return NextResponse.json(
        { success: false, error: 'Failed to record payout', details: payoutError },
        { status: 500 }
      );
    }

    // 9. Record in fee_accrual_ledger
    const { error: ledgerError } = await supabase
      .from('fee_accrual_ledger')
      .insert({
        token_id,
        entry_type: 'PAYOUT_TO_EARNER',
        beneficiary_kind: 'EARNER',
        beneficiary_wallet: earner_wallet,
        amount_lamports: payoutAmountLamports,
        external_tx_signature: signature,
        related_payout_id: payoutRecord.id
      });

    if (ledgerError) {
      console.error('❌ Error recording ledger entry:', ledgerError);
      // Don't fail the request, but log the error
    }

    // 10. Wait for confirmation (optional - can be async)
    try {
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        console.error('❌ Transaction failed:', confirmation.value.err);
        
        // Update payout record to failed
        await supabase
          .from('royalty_payouts')
          .update({
            transaction_status: 'failed',
            transaction_error: JSON.stringify(confirmation.value.err),
            completed_at: new Date().toISOString()
          })
          .eq('id', payoutRecord.id);

        return NextResponse.json(
          { success: false, error: 'Transaction failed', signature },
          { status: 500 }
        );
      }

      // Update payout record to confirmed
      await supabase
        .from('royalty_payouts')
        .update({
          transaction_status: 'confirmed',
          completed_at: new Date().toISOString()
        })
        .eq('id', payoutRecord.id);

      console.log(`✅ Payout completed successfully! Signature: ${signature}`);

      return NextResponse.json({
        success: true,
        message: 'Payout processed successfully',
        data: {
          payout_id: payoutRecord.id,
          transaction_signature: signature,
          amount_sol: payoutAmountLamports / LAMPORTS_PER_SOL,
          earner_wallet,
          token_name: tokenInfo.name,
          token_symbol: tokenInfo.symbol
        }
      });

    } catch (confirmError) {
      console.error('❌ Error confirming transaction:', confirmError);
      
      // Update payout record to failed
      await supabase
        .from('royalty_payouts')
        .update({
          transaction_status: 'failed',
          transaction_error: confirmError instanceof Error ? confirmError.message : String(confirmError),
          completed_at: new Date().toISOString()
        })
        .eq('id', payoutRecord.id);

      // Check for specific error types
      let errorMessage = 'Network failure, please try again later';
      const errorMessageStr = confirmError instanceof Error ? confirmError.message : String(confirmError);
      
      if (errorMessageStr.includes('rate limit') || errorMessageStr.includes('429')) {
        errorMessage = 'RPC rate limit exceeded';
      } else if (errorMessageStr.includes('network') || errorMessageStr.includes('connection')) {
        errorMessage = 'Network failure, please try again later';
      }

      return NextResponse.json(
        { success: false, error: errorMessage, signature },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Payout processing error:', error);
    
    // Check for specific error types
    let errorMessage = 'Network failure, please try again later';
    const errorMessageStr = error instanceof Error ? error.message : String(error);
    
    if (errorMessageStr.includes('rate limit') || errorMessageStr.includes('429')) {
      errorMessage = 'RPC rate limit exceeded';
    } else if (errorMessageStr.includes('network') || errorMessageStr.includes('connection')) {
      errorMessage = 'Network failure, please try again later';
    } else if (errorMessageStr.includes('insufficient') || errorMessageStr.includes('balance')) {
      errorMessage = 'Please try again later';
    }

    return NextResponse.json(
      { success: false, error: errorMessage, details: errorMessageStr },
      { status: 500 }
    );
  }
}
