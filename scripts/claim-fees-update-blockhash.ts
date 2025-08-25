import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { BagsSDK } from "@bagsfm/bags-sdk";
import { Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { createClient } from '@supabase/supabase-js';

// Initialize SDK
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL as string;
const PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

if (!BAGS_API_KEY || !PRIVATE_KEY || !SOLANA_RPC_URL) {
    throw new Error("BAGS_API_KEY, TREASURY_PRIVATE_KEY, and SOLANA_RPC_URL are required");
}

const connection = new Connection(SOLANA_RPC_URL);
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function claimAllFeesUpdateBlockhash() {
    try {
        const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
        const TREASURY_WALLET_ADDRESS = process.env.TREASURY_WALLET_ADDRESS;
        const SECONDARY_WALLET_KEY = process.env.SECONDARY_WALLET_KEY;

        if (!TREASURY_PRIVATE_KEY) {
            throw new Error("TREASURY_PRIVATE_KEY is required");
        }
        if (!SECONDARY_WALLET_KEY) {
            throw new Error("SECONDARY_WALLET_KEY is required to co-sign claim transactions");
        }

        const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(TREASURY_PRIVATE_KEY));
        const secondaryKeypair = Keypair.fromSecretKey(bs58.decode(SECONDARY_WALLET_KEY));

        if (TREASURY_WALLET_ADDRESS && TREASURY_WALLET_ADDRESS !== treasuryKeypair.publicKey.toBase58()) {
            throw new Error("TREASURY_WALLET_ADDRESS does not match derived public key from TREASURY_PRIVATE_KEY");
        }

        console.log(`💰 Treasury wallet: ${treasuryKeypair.publicKey.toBase58()}`);
        console.log(`💰 Secondary wallet: ${secondaryKeypair.publicKey.toBase58()}`);
        console.log(`💰 Claiming ALL fees for treasury wallet`);

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

        console.log("\n🎯 Creating claim transactions using SDK and updating blockhash...");

        let claimsProcessed = 0;

        // Process each position using SDK and update blockhash (as per BAGS support)
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
                const claimTransactions = await sdk.fee.getClaimTransaction(
                    treasuryKeypair.publicKey,
                    position
                );

                if (!claimTransactions || claimTransactions.length === 0) {
                    console.log(`⚠️  No claim transactions generated for this position.`);
                    continue;
                }

                console.log(`✨ Generated ${claimTransactions.length} claim transaction(s) via SDK`);

                // Sign and send transactions with updated blockhash
                console.log(`🔑 Signing and sending transactions with updated blockhash...`);

                for (let j = 0; j < claimTransactions.length; j++) {
                    let transaction = claimTransactions[j];

                    try {
                        // Log transaction details before modification
                        console.log(`🔍 Transaction ${j + 1} details:`);
                        console.log(`   - Signatures: ${transaction.signatures.length}`);
                        console.log(`   - Original blockhash: ${transaction.message.recentBlockhash}`);
                        console.log(`   - Fee payer: ${transaction.message.header.numRequiredSignatures} required, ${transaction.message.header.numReadonlySignedAccounts} readonly signed`);
                        
                        // Show the first few account keys to identify signers
                        console.log(`   - Account keys (first 5):`);
                        for (let k = 0; k < Math.min(5, transaction.message.staticAccountKeys.length); k++) {
                            const key = transaction.message.staticAccountKeys[k];
                            const isSigner = k < transaction.message.header.numRequiredSignatures;
                            console.log(`     ${k}: ${key.toBase58()} ${isSigner ? '(SIGNER)' : '(READONLY)'}`);
                        }
                        
                        // Count filled signatures (Uint8Array not all zeros)
                        const isFilledSignature = (sig: Uint8Array) => {
                            for (let k = 0; k < sig.length; k++) {
                                if (sig[k] !== 0) return true;
                            }
                            return false;
                        };
                        const nonNullSignatures = transaction.signatures.filter(isFilledSignature).length;
                        console.log(`   - Filled signatures: ${nonNullSignatures}`);
                        
                        let txSignature: string | null = null;

                        // Following Ramyo's guidance: ALWAYS update blockhash before signing
                        console.log(`🔄 Following Ramyo's guidance: updating blockhash before signing...`);
                        const freshBlockhash = await connection.getLatestBlockhash(commitment);
                        console.log(`🆕 Fresh blockhash: ${freshBlockhash.blockhash} (valid until ${freshBlockhash.lastValidBlockHeight})`);
                        
                        // Update the transaction's blockhash (as per Ramyo's guidance)
                        transaction.message.recentBlockhash = freshBlockhash.blockhash;
                        
                        // Sign with treasury wallet
                        transaction.sign([treasuryKeypair]);
                        
                        console.log(`📡 Sending transaction with updated blockhash...`);
                        txSignature = await connection.sendTransaction(transaction, { maxRetries: 3, skipPreflight: false });
                        console.log(`🔑 Confirming transaction signature: ${txSignature}`);
                        
                        const confirmed = await connection.confirmTransaction({
                            blockhash: freshBlockhash.blockhash,
                            lastValidBlockHeight: freshBlockhash.lastValidBlockHeight,
                            signature: txSignature,
                        }, commitment);
                        if (confirmed.value.err) {
                            throw new Error(`Error confirming transaction: ${JSON.stringify(confirmed.value.err)}`);
                        }

                        {
                            console.log(`✅ Transaction ${j + 1} confirmed successfully!`);
                            await supabase
                                .from('bags_claims')
                                .insert({
                                    token_id: null,
                                    treasury_wallet: treasuryKeypair.publicKey.toBase58(),
                                    amount_lamports: 0,
                                    tx_signature: txSignature as string,
                                    status: 'confirmed',
                                    occurred_at: new Date().toISOString(),
                                });
                            claimsProcessed++;
                        }
                    } catch (txError) {
                        console.error(`🚨 Failed to send transaction ${j + 1}:`, txError);
                        try {
                            // Try to extract logs if it's a SendTransactionError
                            const anyErr: any = txError as any;
                            if (anyErr.getLogs) {
                                const logs = await anyErr.getLogs();
                                console.error('🧾 Transaction logs:', logs);
                            }
                        } catch (e) {
                            // ignore
                        }
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
    console.log("🔄 Starting fee claiming job with updated blockhash (as per BAGS support)...");
    const startTime = Date.now();
    
    try {
        const claimsProcessed = await claimAllFeesUpdateBlockhash();
        
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
