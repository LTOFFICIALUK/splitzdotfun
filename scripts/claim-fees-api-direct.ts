import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { Keypair, LAMPORTS_PER_SOL, Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

// Config
const BAGS_API_KEY = process.env.BAGS_API_KEY as string;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL as string;
const PRIVATE_KEY = process.env.SINGLE_WALLET_TEST_KEY as string;

if (!BAGS_API_KEY || !PRIVATE_KEY || !SOLANA_RPC_URL) {
  throw new Error("BAGS_API_KEY, SINGLE_WALLET_TEST_KEY, and SOLANA_RPC_URL are required");
}

const connection = new Connection(SOLANA_RPC_URL);

async function claimFeesViaDirectAPI() {
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    console.log(`💼 Test wallet: ${keypair.publicKey.toBase58()}`);

    // Position data from our previous runs
    const positionData = {
      feeClaimer: keypair.publicKey.toBase58(),
      tokenMint: "HqndxNJGETMBr2FaVq1AHrQtoqhTmSAbAQzGbajsBAGS",
      virtualPoolAddress: "MSJpcx4rdxVkTWa3EfXzveHYV526KcusevqmtXzkmua",
      claimVirtualPoolFees: true,
      claimDammV2Fees: false,
      isCustomFeeVault: false
    };

    console.log("🎯 Requesting claim transactions via direct API...");
    console.log("📋 Position data:", JSON.stringify(positionData, null, 2));

    // Call the direct API endpoint
    const response = await fetch("https://public-api-v2.bags.fm/api/v1/token-launch/claim-txs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BAGS_API_KEY,
      },
      body: JSON.stringify(positionData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("📡 API Response:", JSON.stringify(result, null, 2));

    if (!result.success || !result.response || result.response.length === 0) {
      throw new Error("No claim transactions returned from API");
    }

    let claimsProcessed = 0;

    for (let i = 0; i < result.response.length; i++) {
      const txData = result.response[i];
      console.log(`\n🔍 Processing transaction ${i + 1}:`);
      console.log(`   - Blockhash: ${txData.blockhash.blockhash}`);
      console.log(`   - Valid until: ${txData.blockhash.lastValidBlockHeight}`);

      try {
        // Debug the transaction data
        console.log(`   - Transaction data length: ${txData.tx.length}`);
        console.log(`   - Transaction data (first 100 chars): ${txData.tx.substring(0, 100)}...`);
        console.log(`   - Transaction data (last 100 chars): ...${txData.tx.substring(txData.tx.length - 100)}`);
        
        // Check if it's valid base64
        const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(txData.tx);
        console.log(`   - Is valid base64: ${isValidBase64}`);
        
        // Try different deserialization approaches
        let transaction: VersionedTransaction | any;
        let isVersioned = false;
        try {
          // Try as versioned transaction first
          transaction = VersionedTransaction.deserialize(Buffer.from(txData.tx, 'base64'));
          isVersioned = true;
          console.log(`   - Successfully deserialized as VersionedTransaction`);
        } catch (e1) {
          console.log(`   - VersionedTransaction deserialization failed: ${e1}`);
          try {
            // Try as legacy transaction
            const { Transaction } = await import('@solana/web3.js');
            transaction = Transaction.from(Buffer.from(txData.tx, 'base64'));
            isVersioned = false;
            console.log(`   - Successfully deserialized as Legacy Transaction`);
          } catch (e2) {
            console.log(`   - Legacy Transaction deserialization failed: ${e2}`);
            
            // Try as raw bytes
            try {
              const rawBuffer = Buffer.from(txData.tx, 'base64');
              console.log(`   - Raw buffer length: ${rawBuffer.length}`);
              console.log(`   - Raw buffer (first 32 bytes): ${rawBuffer.slice(0, 32).toString('hex')}`);
              
              // Try to parse as versioned transaction with raw buffer
              transaction = VersionedTransaction.deserialize(rawBuffer);
              isVersioned = true;
              console.log(`   - Successfully deserialized as VersionedTransaction from raw buffer`);
            } catch (e3) {
              console.log(`   - Raw buffer deserialization failed: ${e3}`);
              throw new Error(`Failed to deserialize transaction: ${e1}, ${e2}, ${e3}`);
            }
          }
        }
        
        console.log(`   - Signatures: ${transaction.signatures.length}`);
        console.log(`   - Required signers: ${transaction.message.header.numRequiredSignatures}`);

        // Show account keys
        console.log(`   - Account keys (first 5):`);
        const accountKeys = isVersioned ? transaction.message.staticAccountKeys : transaction.message.accountKeys;
        for (let k = 0; k < Math.min(5, accountKeys.length); k++) {
          const key = accountKeys[k];
          const isSigner = k < transaction.message.header.numRequiredSignatures;
          console.log(`     ${k}: ${key.toBase58()} ${isSigner ? '(SIGNER)' : '(READONLY)'}`);
        }

        // Sign the transaction
        if (isVersioned) {
          transaction.sign([keypair]);
        } else {
          transaction.sign(keypair);
        }
        
        console.log(`📡 Sending transaction...`);
        const txSignature = await connection.sendTransaction(transaction, { 
          maxRetries: 3, 
          skipPreflight: false 
        });
        
        console.log(`🔑 Confirming transaction signature: ${txSignature}`);
        
        const confirmed = await connection.confirmTransaction({
          blockhash: txData.blockhash.blockhash,
          lastValidBlockHeight: txData.blockhash.lastValidBlockHeight,
          signature: txSignature,
        }, "processed");
        
        if (confirmed.value.err) {
          throw new Error(`Error confirming transaction: ${JSON.stringify(confirmed.value.err)}`);
        }
        
        console.log(`✅ Transaction ${i + 1} confirmed successfully!`);
        claimsProcessed++;
        
      } catch (txError: any) {
        console.error(`🚨 Failed to send transaction ${i + 1}:`, txError?.message || txError);
        try {
          if (txError?.getLogs) {
            const logs = await txError.getLogs();
            console.error('🧾 Transaction logs:', logs);
          }
        } catch {}
      }
    }

    console.log(`\n🎉 Direct API claim test completed. Claims processed: ${claimsProcessed}`);
    return claimsProcessed;
  } catch (error) {
    console.error("🚨 Unexpected error occurred:", error);
    return 0;
  }
}

async function main() {
  console.log("🔄 Starting direct API claim test...");
  const startTime = Date.now();
  try {
    const claimsProcessed = await claimFeesViaDirectAPI();
    const duration = Date.now() - startTime;
    console.log(`✅ Direct API test finished. Claims processed: ${claimsProcessed}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    process.exit(0);
  } catch (e) {
    console.error("💥 Direct API test failed:", e);
    process.exit(1);
  }
}

main();
