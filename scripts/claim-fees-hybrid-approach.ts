import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { BagsSDK } from "@bagsfm/bags-sdk";
import { Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import bs58 from "bs58";

// Config
const BAGS_API_KEY = process.env.BAGS_API_KEY as string;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL as string;
const PRIVATE_KEY = process.env.SINGLE_WALLET_TEST_KEY as string;

if (!BAGS_API_KEY || !PRIVATE_KEY || !SOLANA_RPC_URL) {
  throw new Error("BAGS_API_KEY, SINGLE_WALLET_TEST_KEY, and SOLANA_RPC_URL are required");
}

const connection = new Connection(SOLANA_RPC_URL);
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

async function claimFeesHybridApproach() {
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    console.log(`💼 Test wallet: ${keypair.publicKey.toBase58()}`);

    // Step 1: Get fresh blockhash from direct API
    console.log("🎯 Getting fresh blockhash from direct API...");
    const positionData = {
      feeClaimer: keypair.publicKey.toBase58(),
      tokenMint: "HqndxNJGETMBr2FaVq1AHrQtoqhTmSAbAQzGbajsBAGS",
      virtualPoolAddress: "MSJpcx4rdxVkTWa3EfXzveHYV526KcusevqmtXzkmua",
      claimVirtualPoolFees: true,
      claimDammV2Fees: false,
      isCustomFeeVault: false
    };

    const apiResponse = await fetch("https://public-api-v2.bags.fm/api/v1/token-launch/claim-txs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BAGS_API_KEY,
      },
      body: JSON.stringify(positionData),
    });

    if (!apiResponse.ok) {
      throw new Error(`API request failed: ${apiResponse.status}`);
    }

    const apiResult = await apiResponse.json();
    console.log("📡 API Response:", JSON.stringify(apiResult, null, 2));

    if (!apiResult.success || !apiResult.response || apiResult.response.length === 0) {
      throw new Error("No claim transactions returned from API");
    }

    const freshBlockhash = apiResult.response[0].blockhash;
    console.log(`🆕 Fresh blockhash from API: ${freshBlockhash.blockhash} (valid until ${freshBlockhash.lastValidBlockHeight})`);

    // Step 2: Get claimable positions via SDK
    console.log("🔍 Fetching claimable positions via SDK...");
    const allPositions = await sdk.fee.getAllClaimablePositions(keypair.publicKey);

    if (allPositions.length === 0) {
      console.log("❌ No claimable positions found for this wallet.");
      return 0;
    }

    const targetPositions = allPositions.filter(p => p.baseMint === "HqndxNJGETMBr2FaVq1AHrQtoqhTmSAbAQzGbajsBAGS");

    if (targetPositions.length === 0) {
      console.log("❌ No claimable positions for the specified token mint.");
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

      console.log("\n🎯 Creating claim transactions via SDK with fresh blockhash...");
      const claimTransactions = await sdk.fee.getClaimTransaction(keypair.publicKey, position);

      if (!claimTransactions || claimTransactions.length === 0) {
        console.log("⚠️  No claim transactions generated for this position.");
        continue;
      }

      for (let j = 0; j < claimTransactions.length; j++) {
        const transaction = claimTransactions[j];

        try {
          console.log(`\n🔍 Transaction ${j + 1} details:`);
          console.log(`   - Signatures: ${transaction.signatures.length}`);
          console.log(`   - Original blockhash: ${transaction.message.recentBlockhash}`);
          console.log(`   - Required signers: ${transaction.message.header.numRequiredSignatures}`);

          // Show account keys
          console.log(`   - Account keys (first 5):`);
          for (let k = 0; k < Math.min(5, transaction.message.staticAccountKeys.length); k++) {
            const key = transaction.message.staticAccountKeys[k];
            const isSigner = k < transaction.message.header.numRequiredSignatures;
            console.log(`     ${k}: ${key.toBase58()} ${isSigner ? '(SIGNER)' : '(READONLY)'}`);
          }

          // Update with fresh blockhash from API
          console.log(`🔄 Updating transaction with fresh blockhash from API...`);
          transaction.message.recentBlockhash = freshBlockhash.blockhash;

          // Sign the transaction
          transaction.sign([keypair]);
          
          console.log(`📡 Sending transaction...`);
          const txSignature = await connection.sendTransaction(transaction, { 
            maxRetries: 3, 
            skipPreflight: false 
          });
          
          console.log(`🔑 Confirming transaction signature: ${txSignature}`);
          
          const confirmed = await connection.confirmTransaction({
            blockhash: freshBlockhash.blockhash,
            lastValidBlockHeight: freshBlockhash.lastValidBlockHeight,
            signature: txSignature,
          }, "processed");
          
          if (confirmed.value.err) {
            throw new Error(`Error confirming transaction: ${JSON.stringify(confirmed.value.err)}`);
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

    console.log(`\n🎉 Hybrid approach claim test completed. Claims processed: ${claimsProcessed}`);
    return claimsProcessed;
  } catch (error) {
    console.error("🚨 Unexpected error occurred:", error);
    return 0;
  }
}

async function main() {
  console.log("🔄 Starting hybrid approach claim test...");
  const startTime = Date.now();
  try {
    const claimsProcessed = await claimFeesHybridApproach();
    const duration = Date.now() - startTime;
    console.log(`✅ Hybrid approach test finished. Claims processed: ${claimsProcessed}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    process.exit(0);
  } catch (e) {
    console.error("💥 Hybrid approach test failed:", e);
    process.exit(1);
  }
}

main();
