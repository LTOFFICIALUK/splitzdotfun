import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { BagsSDK } from "@bagsfm/bags-sdk";
import { Keypair, LAMPORTS_PER_SOL, Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

// Initialize SDK
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=d72f6482-06d8-4c7b-a92a-867c8db174ad";
const PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

if (!BAGS_API_KEY || !PRIVATE_KEY) {
    throw new Error("BAGS_API_KEY and TREASURY_PRIVATE_KEY are required");
}

const connection = new Connection(SOLANA_RPC_URL);
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// HTTP claim tx fetch per Bags docs: POST /token-launch/claim-txs
type ClaimTxApiResponse = {
  success: boolean;
  response?: Array<{
    tx: string; // base58 serialized transaction
    blockhash: { blockhash: string; lastValidBlockHeight: number };
  }>;
  error?: string;
};

const fetchClaimTransactionsHttp = async (body: Record<string, any>): Promise<ClaimTxApiResponse> => {
  const res = await fetch('https://public-api-v2.bags.fm/api/v1/token-launch/claim-txs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': BAGS_API_KEY as string,
    },
    body: JSON.stringify(body),
  });
  return res.json();
};

async function claimAllFeesWithRetry() {
  try {
    const PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("TREASURY_PRIVATE_KEY is not set");
    }

    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

    console.log(`💰 Claiming ALL fees for treasury wallet ${keypair.publicKey.toBase58()}`);

    const connection = sdk.state.getConnection();
    const commitment = sdk.state.getCommitment();

    console.log("🔍 Fetching all claimable positions...");

    // Get all claimable positions for the treasury wallet
    const allPositions = await sdk.fee.getAllClaimablePositions(keypair.publicKey);

    if (allPositions.length === 0) {
      console.log("❌ No claimable positions found for treasury wallet.");
      return 0;
    }

    console.log(`📋 Found ${allPositions.length} total claimable position(s)`);

    let claimsProcessed = 0;

    // Process each position using both SDK and HTTP API with retries
    for (let i = 0; i < allPositions.length; i++) {
      const position = allPositions[i];
      console.log(`\n⚙️  Processing position ${i + 1}/${allPositions.length}...`);

      const virtual = Number(position.virtualPoolClaimableAmount || 0);
      const damm = Number(position.dammPoolClaimableAmount || 0);
      const custom = position.isCustomFeeVault
        ? Number(position.customFeeVaultBalance || 0) * (Number(position.customFeeVaultBps || 0) / 10000)
        : 0;
      
      console.log(`💰 Position amounts - Virtual: ${virtual}, DAMM: ${damm}, Custom: ${custom}`);
      
      if ((virtual + damm + custom) === 0) {
        console.log('⏭️ Skipping position with zero claimable amounts');
        continue;
      }
      
      console.log(`✅ Position has claimable amounts, proceeding with claim...`);

      // Try SDK first
      let success = false;
      
      try {
        console.log(`🔄 Attempting SDK claim...`);
        success = await trySdkClaim(position, keypair, connection, commitment);
      } catch (error) {
        console.log(`❌ SDK claim failed: ${error}`);
      }

      // If SDK fails, try HTTP API with fresh blockhash
      if (!success) {
        try {
          console.log(`🔄 Attempting HTTP API claim with fresh blockhash...`);
          success = await tryHttpClaimWithFreshBlockhash(position, keypair, connection, commitment);
        } catch (error) {
          console.log(`❌ HTTP API claim failed: ${error}`);
        }
      }

      if (success) {
        claimsProcessed++;
      }
    }

    console.log(`🎉 Fee claiming process completed! Claims processed: ${claimsProcessed}`);
    return claimsProcessed;
  }
  catch (error) {
    console.error(`🚨 Unexpected error occurred:`, error);
    return 0;
  }
}

async function trySdkClaim(position: any, keypair: Keypair, connection: Connection, commitment: string): Promise<boolean> {
  try {
    // Generate claim transactions for this position using SDK
    const claimTransactions = await sdk.fee.getClaimTransaction(
      keypair.publicKey,
      position
    );

    if (!claimTransactions || claimTransactions.length === 0) {
      console.log(`⚠️  No claim transactions generated for this position.`);
      return false;
    }

    console.log(`✨ Generated ${claimTransactions.length} claim transaction(s) via SDK`);

    // Sign and send transactions
    console.log(`🔑 Signing and sending transactions...`);

    for (let j = 0; j < claimTransactions.length; j++) {
      const transaction = claimTransactions[j];

      try {
        transaction.sign([keypair]);

        const txSignature = await connection.sendTransaction(transaction, { 
          maxRetries: 3, 
          skipPreflight: false 
        });

        console.log(`🔑 Confirming transaction signature: ${txSignature}`);

        const confirmed = await connection.confirmTransaction(txSignature, commitment as any);

        if (confirmed.value.err) {
          console.error(`💥 Error confirming transaction ${j + 1}:`, confirmed.value.err);
          throw new Error("Error confirming transaction");
        }
        else {
          console.log(`✅ Transaction ${j + 1} confirmed successfully!`);
          await supabase
            .from('bags_claims')
            .insert({
              token_id: null,
              treasury_wallet: keypair.publicKey.toBase58(),
              amount_lamports: 0,
              tx_signature: txSignature,
              status: 'confirmed',
              occurred_at: new Date().toISOString(),
            });
          return true;
        }
      } catch (txError) {
        console.error(`🚨 Failed to send transaction ${j + 1}:`, txError);
        return false;
      }
    }
  } catch (error) {
    console.error('🚨 SDK claim failed:', error);
    return false;
  }
  return false;
}

async function tryHttpClaimWithFreshBlockhash(position: any, keypair: Keypair, connection: Connection, commitment: string): Promise<boolean> {
  try {
    // Build request body for HTTP API
    const virtual = Number(position.virtualPoolClaimableAmount || 0);
    const damm = Number(position.dammPoolClaimableAmount || 0);
    const custom = (position as any).isCustomFeeVault
      ? Number((position as any).customFeeVaultBalance || 0) * (Number((position as any).customFeeVaultBps || 0) / 10000)
      : 0;
    
    const body: any = {
      feeClaimer: keypair.publicKey.toBase58(),
      tokenMint: position.baseMint,
    };
    
    if (virtual > 0 && (position as any).virtualPoolAddress) {
      body.claimVirtualPoolFees = true;
      body.virtualPoolAddress = (position as any).virtualPoolAddress;
    }
    
    if (custom > 0 && (position as any).isCustomFeeVault) {
      body.isCustomFeeVault = true;
      body.customFeeVaultClaimerSide = (position as any).customFeeVaultClaimerSide ?? null;
      body.customFeeVaultClaimerA = (position as any).customFeeVaultClaimerA ?? null;
      body.customFeeVaultClaimerB = (position as any).customFeeVaultClaimerB ?? null;
    }

    console.log(`📤 Request body: ${JSON.stringify(body, null, 2)}`);
    
    // Get fresh transaction from HTTP API
    const api = await fetchClaimTransactionsHttp(body);
    console.log(`📥 API response: ${JSON.stringify(api, null, 2)}`);
    
    if (!api.success || !api.response || api.response.length === 0) {
      throw new Error(`Bags API returned no transactions: ${api.error || 'unknown error'}`);
    }

    // Process all returned txs
    for (const item of api.response) {
      const serialized = bs58.decode(item.tx);
      const tx = VersionedTransaction.deserialize(Buffer.from(serialized));
      
      console.log(`🔎 Provided blockhash: ${item.blockhash.blockhash}`);
      console.log(`🔎 Tx message blockhash: ${tx.message.recentBlockhash}`);

      // Get a fresh blockhash and update the transaction
      console.log(`🔄 Getting fresh blockhash...`);
      const freshBlockhash = await connection.getLatestBlockhash('confirmed');
      console.log(`🆕 Fresh blockhash: ${freshBlockhash.blockhash}`);

      // Create a new transaction with the fresh blockhash
      const newTx = new VersionedTransaction(tx.message);
      newTx.message.recentBlockhash = freshBlockhash.blockhash;

      console.log(`🔐 Signing transaction with treasury keypair...`);
      newTx.sign([keypair]);

      const txSignature = await connection.sendTransaction(newTx, { 
        maxRetries: 3, 
        skipPreflight: false 
      });

      console.log(`🔑 Confirming transaction signature: ${txSignature}`);

      const confirmed = await connection.confirmTransaction(txSignature, commitment as any);

      if (confirmed.value.err) {
        console.error(`💥 Error confirming transaction:`, confirmed.value.err);
        throw new Error("Error confirming transaction");
      }
      else {
        console.log(`✅ Transaction confirmed successfully!`);
        await supabase
          .from('bags_claims')
          .insert({
            token_id: null,
            treasury_wallet: keypair.publicKey.toBase58(),
            amount_lamports: 0,
            tx_signature: txSignature,
            status: 'confirmed',
            occurred_at: new Date().toISOString(),
          });
        return true;
      }
    }
  } catch (error) {
    console.error('🚨 HTTP API claim failed:', error);
    return false;
  }
  return false;
}

async function main() {
  console.log("🔄 Starting fee claiming job with retry logic...");
  const startTime = Date.now();
  
  try {
    const claimsProcessed = await claimAllFeesWithRetry();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Fee claiming completed successfully!`);
    console.log(`📊 Claims processed: ${claimsProcessed}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    process.exit(0);
  } catch (error) {
    console.error("💥 Fee claiming failed:", error);
    process.exit(1);
  }
}

main();
