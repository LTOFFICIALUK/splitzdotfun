import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { Keypair, LAMPORTS_PER_SOL, Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createClient } from '@supabase/supabase-js';

// Initialize connection
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=d72f6482-06d8-4c7b-a92a-867c8db174ad";

if (!BAGS_API_KEY) {
    throw new Error("BAGS_API_KEY is required");
}

const connection = new Connection(SOLANA_RPC_URL);

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchClaimTransactionsWithManualBlockhash(walletAddress: string, blockhash: string) {
    const url = `https://public-api-v2.bags.fm/api/v1/token-launch/claim-txs`;
    
    console.log(`🔗 Fetching claim transactions from: ${url}`);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-API-Key': BAGS_API_KEY!,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            wallet: walletAddress,
            blockhash: blockhash
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📦 Received ${data.transactions?.length || 0} transactions from BAGS API`);
    
    return data.transactions || [];
}

async function claimAllFeesHttpManualBlockhash() {
    try {
        const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
        const SECONDARY_WALLET_KEY = process.env.SECONDARY_WALLET_KEY;

        if (!TREASURY_PRIVATE_KEY || !SECONDARY_WALLET_KEY) {
            throw new Error("TREASURY_PRIVATE_KEY and SECONDARY_WALLET_KEY are required");
        }

        const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(TREASURY_PRIVATE_KEY));
        const secondaryKeypair = Keypair.fromSecretKey(bs58.decode(SECONDARY_WALLET_KEY));

        console.log(`💰 Treasury wallet: ${treasuryKeypair.publicKey.toBase58()}`);
        console.log(`💰 Secondary wallet: ${secondaryKeypair.publicKey.toBase58()}`);

        console.log(`💰 Claiming ALL fees using HTTP API with manual blockhash...`);

        // Get fresh blockhash first
        console.log(`🔄 Getting fresh blockhash...`);
        const freshBlockhash = await connection.getLatestBlockhash('processed');
        console.log(`🆕 Fresh blockhash: ${freshBlockhash.blockhash} (valid until ${freshBlockhash.lastValidBlockHeight})`);

        // Fetch claim transactions with manual blockhash
        console.log(`🔍 Fetching claim transactions with manual blockhash...`);
        const serializedTransactions = await fetchClaimTransactionsWithManualBlockhash(
            treasuryKeypair.publicKey.toBase58(),
            freshBlockhash.blockhash
        );

        if (serializedTransactions.length === 0) {
            console.log("❌ No claim transactions found for this wallet.");
            return 0;
        }

        console.log(`📋 Found ${serializedTransactions.length} claim transaction(s)`);

        let claimsProcessed = 0;

        // Process each transaction
        for (let i = 0; i < serializedTransactions.length; i++) {
            const serializedTx = serializedTransactions[i];
            console.log(`\n⚙️  Processing transaction ${i + 1}/${serializedTransactions.length}...`);

            try {
                // Deserialize the transaction
                console.log(`🔧 Deserializing transaction...`);
                const transaction = VersionedTransaction.deserialize(Buffer.from(serializedTx, 'base64'));

                console.log(`🔍 Transaction details:`);
                console.log(`   - Signatures: ${transaction.signatures.length}`);
                console.log(`   - Blockhash: ${transaction.message.recentBlockhash}`);
                console.log(`   - Required signatures: ${transaction.message.header.numRequiredSignatures}`);

                // Check if the blockhash matches our fresh one
                if (transaction.message.recentBlockhash !== freshBlockhash.blockhash) {
                    console.log(`⚠️  Warning: Transaction blockhash doesn't match our fresh blockhash`);
                    console.log(`   Expected: ${freshBlockhash.blockhash}`);
                    console.log(`   Got: ${transaction.message.recentBlockhash}`);
                } else {
                    console.log(`✅ Blockhash matches our fresh blockhash`);
                }

                // Sign the transaction with our treasury keypair
                console.log(`🔐 Signing transaction with treasury keypair...`);
                transaction.sign([treasuryKeypair]);

                // Send transaction
                console.log(`📡 Sending transaction...`);
                const txSignature = await connection.sendTransaction(transaction, { 
                    maxRetries: 3, 
                    skipPreflight: false 
                });

                console.log(`🔑 Confirming transaction signature: ${txSignature}`);

                // Confirm transaction
                const confirmed = await connection.confirmTransaction(txSignature, 'processed' as any);

                if (confirmed.value.err) {
                    console.error(`💥 Error confirming transaction ${i + 1}:`, confirmed.value.err);
                    throw new Error("Error confirming transaction");
                }
                else {
                    console.log(`✅ Transaction ${i + 1} confirmed successfully!`);
                    await supabase
                        .from('bags_claims')
                        .insert({
                            token_id: null,
                            treasury_wallet: treasuryKeypair.publicKey.toBase58(),
                            amount_lamports: 0,
                            tx_signature: txSignature,
                            status: 'confirmed',
                            occurred_at: new Date().toISOString(),
                        });
                    claimsProcessed++;
                }
            } catch (txError) {
                console.error(`🚨 Failed to send transaction ${i + 1}:`, txError);
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

async function main() {
    console.log("🔄 Starting fee claiming job using HTTP API with manual blockhash...");
    const startTime = Date.now();
    
    try {
        const claimsProcessed = await claimAllFeesHttpManualBlockhash();
        
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
