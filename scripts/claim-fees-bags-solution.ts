import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { BagsSDK } from "@bagsfm/bags-sdk";
import { Keypair, LAMPORTS_PER_SOL, Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createClient } from '@supabase/supabase-js';

// Initialize SDK
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=d72f6482-06d8-4c7b-a92a-867c8db174ad";

if (!BAGS_API_KEY) {
    throw new Error("BAGS_API_KEY is required");
}

const connection = new Connection(SOLANA_RPC_URL);
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function claimAllFeesBagsSolution() {
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

        console.log(`💰 Claiming ALL fees for both wallets`);

        const connection = sdk.state.getConnection();
        const commitment = sdk.state.getCommitment();

        console.log("🔍 Fetching all claimable positions...");

        // Get all claimable positions for the treasury wallet (SDK approach)
        const allPositions = await sdk.fee.getAllClaimablePositions(treasuryKeypair.publicKey);

        if (allPositions.length === 0) {
            console.log("❌ No claimable positions found for this wallet.");
            return 0;
        }

        console.log(`📋 Found ${allPositions.length} total claimable position(s)`);

        // Display all positions
        allPositions.forEach((position, index) => {
            console.log(`\n📊 Position ${index + 1}:`);
            console.log(`   🪙 Token: ${position.baseMint}`);
            console.log(`   🏊 Virtual Pool: ${position.virtualPoolAddress}`);

            if (position.virtualPoolClaimableAmount) {
                const virtualAmount = Number(position.virtualPoolClaimableAmount) / LAMPORTS_PER_SOL;
                console.log(`   💰 Virtual Pool Claimable: ${virtualAmount.toFixed(6)} SOL`);
            }

            if (position.dammPoolClaimableAmount) {
                const dammAmount = Number(position.dammPoolClaimableAmount) / LAMPORTS_PER_SOL;
                console.log(`   💰 DAMM Pool Claimable: ${dammAmount.toFixed(6)} SOL`);
            }

            if (position.isCustomFeeVault) {
                const customFeeVaultBalance = Number(position.customFeeVaultBalance) / LAMPORTS_PER_SOL;
                const bps = position.customFeeVaultBps;

                const claimableAmount = customFeeVaultBalance * (bps / 10000);

                console.log(`   🏦 Custom Fee Vault: Yes`);
                console.log(`   📍 Claimer Side: ${position.customFeeVaultClaimerSide}`);
                console.log(`   💰 Custom Fee Vault Claimable: ${claimableAmount.toFixed(6)} SOL`);
            }
        });

        console.log("\n🎯 Creating claim transactions using BAGS solution...");

        let claimsProcessed = 0;

        // Process each position using BAGS solution
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

            try {
                // Generate claim transactions for this position using SDK
                console.log(`🔄 Getting transaction from BAGS SDK...`);
                const claimTransactions = await sdk.fee.getClaimTransaction(
                    treasuryKeypair.publicKey,
                    position
                );

                if (!claimTransactions || claimTransactions.length === 0) {
                    console.log(`⚠️  No claim transactions generated for this position.`);
                    continue;
                }

                console.log(`✨ Generated ${claimTransactions.length} claim transaction(s) via SDK`);

                // Process each transaction using BAGS solution
                for (let j = 0; j < claimTransactions.length; j++) {
                    const transaction = claimTransactions[j];

                    try {
                        console.log(`🔍 Transaction ${j + 1} details before modification:`);
                        console.log(`   - Signatures: ${transaction.signatures.length}`);
                        console.log(`   - Original blockhash: ${transaction.message.recentBlockhash}`);
                        console.log(`   - Required signatures: ${transaction.message.header.numRequiredSignatures}`);
                        console.log(`   - Account keys: ${transaction.message.staticAccountKeys.map(key => key.toBase58()).join(', ')}`);
                        console.log(`   - First ${transaction.message.header.numRequiredSignatures} accounts need signatures:`);
                        for (let k = 0; k < transaction.message.header.numRequiredSignatures; k++) {
                            console.log(`     ${k}: ${transaction.message.staticAccountKeys[k].toBase58()}`);
                        }

                        // Get fresh blockhash (as per BAGS support)
                        console.log(`🔄 Getting fresh blockhash...`);
                        const freshBlockhash = await connection.getLatestBlockhash(commitment);
                        console.log(`🆕 Fresh blockhash: ${freshBlockhash.blockhash} (valid until ${freshBlockhash.lastValidBlockHeight})`);

                        // Update the transaction's blockhash (as per BAGS support)
                        console.log(`🔧 Updating transaction blockhash...`);
                        transaction.message.recentBlockhash = freshBlockhash.blockhash;

                        // Don't clear signatures - preserve existing ones and add our signature
                        console.log(`🔐 Adding treasury signature to existing signatures...`);
                        transaction.sign([treasuryKeypair]);

                        // Send transaction
                        console.log(`📡 Sending transaction...`);
                        const txSignature = await connection.sendTransaction(transaction, { 
                            maxRetries: 3, 
                            skipPreflight: false 
                        });

                        console.log(`🔑 Confirming transaction signature: ${txSignature}`);

                        // Confirm transaction
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
                                    treasury_wallet: treasuryKeypair.publicKey.toBase58(),
                                    amount_lamports: 0,
                                    tx_signature: txSignature,
                                    status: 'confirmed',
                                    occurred_at: new Date().toISOString(),
                                });
                            claimsProcessed++;
                        }
                    } catch (txError) {
                        console.error(`🚨 Failed to send transaction ${j + 1}:`, txError);
                    }
                }
            } catch (error) {
                console.error('🚨 SDK claim failed:', error);
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
    console.log("🔄 Starting fee claiming job using BAGS support solution...");
    const startTime = Date.now();
    
    try {
        const claimsProcessed = await claimAllFeesBagsSolution();
        
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
