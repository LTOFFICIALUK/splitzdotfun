import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { BagsSDK } from "@bagsfm/bags-sdk";
import { Keypair, LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

// Config
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL as string;
const PRIVATE_KEY = process.env.SINGLE_WALLET_TEST_KEY as string;
const TARGET_TOKEN_MINT = new PublicKey("HqndxNJGETMBr2FaVq1AHrQtoqhTmSAbAQzGbajsBAGS");

if (!BAGS_API_KEY || !PRIVATE_KEY || !SOLANA_RPC_URL) {
  throw new Error("BAGS_API_KEY, SINGLE_WALLET_TEST_KEY, and SOLANA_RPC_URL are required");
}

const connection = new Connection(SOLANA_RPC_URL);
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

async function claimFeesForTokenSingleWallet() {
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    console.log(`💼 Test wallet: ${keypair.publicKey.toBase58()}`);
    console.log(`🎯 Target token mint: ${TARGET_TOKEN_MINT.toBase58()}`);

    const connection = sdk.state.getConnection();
    const commitment = sdk.state.getCommitment();

    console.log("🔍 Fetching all claimable positions...");
    const allPositions = await sdk.fee.getAllClaimablePositions(keypair.publicKey);

    if (allPositions.length === 0) {
      console.log("❌ No claimable positions found for this wallet.");
      return 0;
    }

    const targetPositions = allPositions.filter(p => p.baseMint === TARGET_TOKEN_MINT.toBase58());

    if (targetPositions.length === 0) {
      console.log("❌ No claimable positions for the specified token mint.");
      console.log("Available token mints:");
      allPositions.forEach((p, i) => console.log(`  ${i+1}. ${p.baseMint}`));
      return 0;
    }

    console.log(`📋 Found ${targetPositions.length} claimable position(s) for target token`);

    let claimsProcessed = 0;

    for (let i = 0; i < targetPositions.length; i++) {
      const position = targetPositions[i];
      console.log(`\n📊 Position ${i + 1}:`);
      console.log(`   🏊 Virtual Pool: ${position.virtualPoolAddress}`);

      if (position.virtualPoolClaimableAmount) {
        const virtualAmount = Number(position.virtualPoolClaimableAmount) / LAMPORTS_PER_SOL;
        console.log(`   💰 Virtual Pool Claimable: ${virtualAmount.toFixed(6)} SOL`);
      }

      if (position.dammPoolClaimableAmount) {
        const dammAmount = Number(position.dammPoolClaimableAmount) / LAMPORTS_PER_SOL;
        console.log(`   💰 DAMM Pool Claimable: ${dammAmount.toFixed(6)} SOL`);
      }

      console.log("\n🎯 Creating claim transactions...");
      const claimTransactions = await sdk.fee.getClaimTransaction(keypair.publicKey, position);

      if (!claimTransactions || claimTransactions.length === 0) {
        console.log("⚠️  No claim transactions generated for this position.");
        continue;
      }

      for (let j = 0; j < claimTransactions.length; j++) {
        let transaction = claimTransactions[j];

        try {
          console.log(`\n🔍 Transaction ${j + 1} details:`);
          console.log(`   - Signatures: ${transaction.signatures.length}`);
          console.log(`   - Required signers: ${transaction.message.header.numRequiredSignatures}`);
          console.log(`   - Blockhash: ${transaction.message.recentBlockhash}`);

          let txSignature: string;

          // Try sending without modifying blockhash first
          try {
            console.log(`📡 Attempting to send without blockhash modification...`);
            transaction.sign([keypair]);
            txSignature = await connection.sendTransaction(transaction, { maxRetries: 3, skipPreflight: false });
            console.log(`🔑 Confirming transaction signature: ${txSignature}`);
            const confirmed = await connection.confirmTransaction(txSignature, commitment as any);
            if (confirmed.value.err) {
              throw new Error(`Error confirming transaction: ${JSON.stringify(confirmed.value.err)}`);
            }
          } catch (e: any) {
            const msg = String(e?.message || e);
            if (msg.includes('Blockhash not found') || msg.includes('signature verification failure') || msg.includes('expired')) {
              console.log(`♻️ Send failed due to blockhash issues. Following Ramyo's guidance: update blockhash before signing...`);
              
              // Get fresh blockhash BEFORE signing (as per Ramyo's guidance)
              const freshBlockhash = await connection.getLatestBlockhash(commitment);
              console.log(`🆕 Fresh blockhash: ${freshBlockhash.blockhash} (valid until ${freshBlockhash.lastValidBlockHeight})`);
              
              // Update the transaction's blockhash (as per Ramyo's guidance)
              transaction.message.recentBlockhash = freshBlockhash.blockhash;
              
              // Now sign with our keypair
              transaction.sign([keypair]);
              
              txSignature = await connection.sendTransaction(transaction, { maxRetries: 3, skipPreflight: false });
              console.log(`🔑 Confirming transaction with updated blockhash: ${txSignature}`);
              
              const confirmed = await connection.confirmTransaction({
                blockhash: freshBlockhash.blockhash,
                lastValidBlockHeight: freshBlockhash.lastValidBlockHeight,
                signature: txSignature,
              }, commitment);
              if (confirmed.value.err) {
                throw new Error(`Error confirming transaction: ${JSON.stringify(confirmed.value.err)}`);
              }
            } else {
              throw e;
            }
          }

          console.log(`✅ Transaction ${j + 1} confirmed successfully!`);
          claimsProcessed++;
        } catch (txError: any) {
          console.error(`🚨 Failed to send transaction ${j + 1}:`, txError?.message || txError);
          try {
            if (txError?.getLogs) {
              const logs = await txError.getLogs();
              console.error('🧾 Transaction logs:', logs);
            }
          } catch {}
        }
      }
    }

    console.log(`\n🎉 Single-wallet test completed. Claims processed: ${claimsProcessed}`);
    return claimsProcessed;
  } catch (error) {
    console.error("🚨 Unexpected error occurred:", error);
    return 0;
  }
}

async function main() {
  console.log("🔄 Starting single-wallet claim test...");
  const startTime = Date.now();
  try {
    const claimsProcessed = await claimFeesForTokenSingleWallet();
    const duration = Date.now() - startTime;
    console.log(`✅ Test run finished. Claims processed: ${claimsProcessed}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    process.exit(0);
  } catch (e) {
    console.error("💥 Test run failed:", e);
    process.exit(1);
  }
}

main();


