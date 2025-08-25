import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { BagsSDK } from "@bagsfm/bags-sdk";
import { Keypair, LAMPORTS_PER_SOL, Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize SDK
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=d72f6482-06d8-4c7b-a92a-867c8db174ad";
const PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

if (!BAGS_API_KEY || !PRIVATE_KEY) {
    throw new Error("BAGS_API_KEY and TREASURY_PRIVATE_KEY are required");
}

const connection = new Connection(SOLANA_RPC_URL);
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

// Using BAGS SDK directly instead of HTTP API

// Using BAGS SDK directly for fee claiming
async function claimFeesForToken(tokenMint: string, tokenName: string, tokenId: string) {
    try {
        const PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

        if (!PRIVATE_KEY) {
            throw new Error("TREASURY_PRIVATE_KEY is not set");
        }

        const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

        console.log(`💰 Claiming fees for token ${tokenName} (${tokenMint}) with wallet ${keypair.publicKey.toBase58()}`);

        const connection = sdk.state.getConnection();
        const commitment = sdk.state.getCommitment();

        console.log("🔍 Fetching all claimable positions...");

        // Get all claimable positions for the wallet
        const allPositions = await sdk.fee.getAllClaimablePositions(keypair.publicKey);

        if (allPositions.length === 0) {
            console.log("❌ No claimable positions found for this wallet.");
            return;
        }

        console.log(`📋 Found ${allPositions.length} total claimable position(s)`);

        // Filter positions for the specific token mint
        const targetPositions = allPositions.filter(position => position.baseMint === tokenMint);

        if (targetPositions.length === 0) {
            console.log(`❌ No claimable positions found for token mint: ${tokenMint}`);
            console.log("Available token mints:");
            allPositions.forEach((position, index) => {
                console.log(`   ${index + 1}. ${position.baseMint}`);
            });
            return;
        }

        console.log(`✅ Found ${targetPositions.length} claimable position(s) for target token`);

        // Display position details
        targetPositions.forEach((position, index) => {
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

        console.log("\n🎯 Creating claim transactions...");

        // Process each target position
        for (let i = 0; i < targetPositions.length; i++) {
            const position = targetPositions[i];
            console.log(`\n⚙️  Processing position ${i + 1}/${targetPositions.length}...`);

            // Generate claim transactions for this position using SDK
            const claimTransactions = await sdk.fee.getClaimTransaction(
                keypair.publicKey,
                position
            );

            if (!claimTransactions || claimTransactions.length === 0) {
                console.log(`⚠️  No claim transactions generated for this position.`);
                continue;
            }

            console.log(`✨ Generated ${claimTransactions.length} claim transaction(s)`);

            // Sign and send transactions
            console.log(`🔑 Signing and sending transactions...`);

            for (let j = 0; j < claimTransactions.length; j++) {
                const transaction = claimTransactions[j];

                try {
                    transaction.sign([keypair]);

                    const blockhash = await connection.getLatestBlockhash(commitment);

                    const txSignature = await connection.sendTransaction(transaction, { 
                        maxRetries: 0, 
                        skipPreflight: true 
                    });

                    console.log(`🔑 Confirming transaction signature: ${txSignature}`);

                    const confirmed = await connection.confirmTransaction({
                        blockhash: blockhash.blockhash,
                        lastValidBlockHeight: blockhash.lastValidBlockHeight,
                        signature: txSignature,
                    }, commitment);

                    if (confirmed.value.err) {
                        console.error(`💥 Error confirming transaction ${j + 1}:`, confirmed.value.err);
                        throw new Error("Error confirming transaction");
                    }
                    else {
                        console.log(`✅ Transaction ${j + 1} confirmed successfully!`);
                        await supabase.from('bags_claims').insert({
                            token_id: tokenId,
                            treasury_wallet: keypair.publicKey.toBase58(),
                            amount_lamports: 0,
                            tx_signature: txSignature,
                            status: 'confirmed',
                            occurred_at: new Date().toISOString(),
                        });
                    }
                } catch (txError) {
                    console.error(`🚨 Failed to send transaction ${j + 1}:`, txError);
                }
            }
        }

        console.log(`🎉 Fee claiming process completed for token ${tokenName}!`);
    }
    catch (error) {
        console.error(`🚨 Unexpected error occurred for token ${tokenName}:`, error);
    }
}

async function getTokensWithRoyaltyEarners() {
  try {
    console.log('🔍 Fetching tokens with royalty earners...');
    
    // Get all tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('tokens')
      .select('id, contract_address, name');

    if (tokenError) {
      console.error('❌ Error fetching tokens:', tokenError);
      return [];
    }

    console.log(`📊 Found ${tokens.length} tokens`);

    // Get all token ownership records with royalty earners
    const { data: ownershipRecords, error: ownershipRecordsError } = await supabase
      .from('token_ownership')
      .select('token_id, royalty_earners')
      .not('royalty_earners', 'is', null);

    if (ownershipRecordsError) {
      console.error('❌ Error fetching ownership records:', ownershipRecordsError);
      return [];
    }

    console.log(`📊 Found ${ownershipRecords.length} ownership records with royalty earners`);

    // Create a map of token_id to ownership data
    const ownershipMap: Record<string, any> = {};
    ownershipRecords.forEach(record => {
      ownershipMap[record.token_id] = record.royalty_earners;
    });

    // Filter tokens that have ownership records with royalty earners
    const tokensWithRoyalties = tokens.filter(token => ownershipMap[token.id]);
    console.log(`📊 Found ${tokensWithRoyalties.length} tokens with royalty earners`);

    // Add ownership data to tokens
    const tokensWithData = tokensWithRoyalties.map(token => ({
      ...token,
      token_ownership: {
        royalty_earners: ownershipMap[token.id]
      }
    }));

    return tokensWithData;
  } catch (error) {
    console.error('Error fetching tokens with royalty earners:', error);
    return [];
  }
}

async function getWalletForSocialHandle(socialHandle: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://public-api-v2.bags.fm/api/v1/token-launch/fee-share/wallet/twitter?twitterUsername=${socialHandle.substring(1)}`,
      {
        headers: {
          'x-api-key': process.env.BAGS_API_KEY!
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.response;
    }
    return null;
  } catch (error) {
    console.error(`Error getting wallet for social handle ${socialHandle}:`, error);
    return null;
  }
}



async function claimAllFeesForTreasury() {
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

    console.log("\n🎯 Creating claim transactions for ALL positions...");

    let claimsProcessed = 0;

    // Process each position using SDK
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
          keypair.publicKey,
          position
        );

        if (!claimTransactions || claimTransactions.length === 0) {
          console.log(`⚠️  No claim transactions generated for this position.`);
          continue;
        }

        console.log(`✨ Generated ${claimTransactions.length} claim transaction(s)`);

        // Sign and send transactions
        console.log(`🔑 Signing and sending transactions...`);

        for (let j = 0; j < claimTransactions.length; j++) {
          const transaction = claimTransactions[j];

                      try {
              // Sign the transaction with our treasury keypair (as per BAGS docs)
              console.log(`🔐 Signing transaction with treasury keypair...`);
              transaction.sign([keypair]);

              const txSignature = await connection.sendTransaction(transaction, { 
                maxRetries: 3, 
                skipPreflight: false 
              });

                          console.log(`🔑 Confirming transaction signature: ${txSignature}`);

              // Confirm transaction without specifying blockhash (let Solana handle it)
              const confirmed = await connection.confirmTransaction(txSignature, commitment);

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
  try {
    console.log('🔄 Starting fee claiming job...');
    
    // Record job start
    const { data: jobRun, error: jobError } = await supabase
      .from('job_runs')
      .insert({
        job_name: 'claim-fees',
        started_at: new Date().toISOString(),
        status: 'running'
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Failed to create job run:', jobError);
      process.exit(1);
    }

    const jobRunId = jobRun.id;
    let startTime = Date.now();

    // Claim ALL fees for treasury wallet
    const claimsProcessed = await claimAllFeesForTreasury();

    // Update job run with success
    await supabase
      .from('job_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success',
        claims_processed: claimsProcessed,
        view_refresh_ms: Date.now() - startTime
      })
      .eq('id', jobRunId);

    console.log(`✅ Fee claiming completed successfully!`);
    console.log(`📊 Claims processed: ${claimsProcessed}`);
    console.log(`⏱️ Duration: ${Date.now() - startTime}ms`);

  } catch (error) {
    console.error('❌ Fee claiming failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
