const { BagsSDK } = require('@bagsfm/bags-sdk');
const { Keypair, Connection } = require('@solana/web3.js');
const bs58 = require('bs58');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Initialize SDK
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.BAGS_SOLANA_RPC_URL || process.env.SOLANA_RPC_URL; // Use BAGS-specific RPC if available
const PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

if (!BAGS_API_KEY || !SOLANA_RPC_URL || !PRIVATE_KEY) {
    throw new Error("BAGS_API_KEY, SOLANA_RPC_URL (or BAGS_SOLANA_RPC_URL), and TREASURY_PRIVATE_KEY are required");
}

console.log(`🔗 Using RPC URL: ${SOLANA_RPC_URL}`);

const connection = new Connection(SOLANA_RPC_URL);
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getFeeShareWallets() {
  try {
    console.log('🔍 Fetching tokens with royalty earners...');
    
    // First, let's check what's in the token_ownership table
    console.log('🔍 Checking token_ownership table...');
    const { data: ownershipData, error: ownershipError } = await supabase
      .from('token_ownership')
      .select('*')
      .limit(5);
    
    if (ownershipError) {
      console.error('❌ Error fetching token_ownership:', ownershipError);
      return [];
    }
    
    console.log('📋 Sample token_ownership data:', ownershipData);
    
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
    const ownershipMap = {};
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

    const feeShareWallets = [];

    for (const token of tokensWithData) {
      try {
        console.log(`\n🔍 Processing token: ${token.name} (${token.contract_address})`);
        console.log(`📄 Raw royalty_earners:`, token.token_ownership.royalty_earners);
        
        let royaltyEarners = token.token_ownership.royalty_earners;
        
        // Parse JSON if it's a string
        if (typeof royaltyEarners === 'string') {
          try {
            royaltyEarners = JSON.parse(royaltyEarners);
            console.log(`✅ Parsed JSON successfully:`, royaltyEarners);
          } catch (parseError) {
            console.error(`❌ Failed to parse royalty_earners for token ${token.name}:`, parseError);
            continue;
          }
        }
        
        // Ensure it's an array
        if (!Array.isArray(royaltyEarners)) {
          console.warn(`⚠️ royalty_earners is not an array for token ${token.name}:`, royaltyEarners);
          continue;
        }
        
        console.log(`📋 Found ${royaltyEarners.length} royalty earners`);
        
        for (const earner of royaltyEarners) {
          console.log(`👤 Processing earner:`, earner);
          
          if (earner.social_or_wallet && earner.social_or_wallet.startsWith('@')) {
            console.log(`🐦 Getting wallet for social handle: ${earner.social_or_wallet}`);
            
            // Get wallet address for social handle using Bags API
            const response = await fetch(
              `https://public-api-v2.bags.fm/api/v1/token-launch/fee-share/wallet/twitter?twitterUsername=${earner.social_or_wallet.substring(1)}`,
              {
                headers: {
                  'x-api-key': process.env.BAGS_API_KEY
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              const walletAddress = data.response;
              
              console.log(`✅ Got wallet address: ${walletAddress}`);
              
              if (walletAddress) {
                feeShareWallets.push({
                  token_id: token.id,
                  token_mint: token.contract_address,
                  token_name: token.name,
                  earner_wallet: walletAddress,
                  earner_social: earner.social_or_wallet,
                  percentage: earner.percentage
                });
              }
            } else {
              console.error(`❌ Failed to get wallet for ${earner.social_or_wallet}: ${response.status}`);
            }
          } else if (earner.social_or_wallet && !earner.social_or_wallet.startsWith('@')) {
            console.log(`💳 Direct wallet address: ${earner.social_or_wallet}`);
            
            // Direct wallet address
            feeShareWallets.push({
              token_id: token.id,
              token_mint: token.contract_address,
              token_name: token.name,
              earner_wallet: earner.social_or_wallet,
              earner_social: null,
              percentage: earner.percentage
            });
          }
        }
      } catch (tokenError) {
        console.error(`❌ Error processing token ${token.name}:`, tokenError);
        continue;
      }
    }

    console.log(`\n📊 Total fee share wallets found: ${feeShareWallets.length}`);
    return feeShareWallets;
  } catch (error) {
    console.error('❌ Error fetching fee share wallets:', error);
    return [];
  }
}

async function claimFeesForWallet(walletAddress, tokenMint, tokenName) {
  try {
    console.log(`\n💰 Claiming fees for wallet ${walletAddress} and token ${tokenMint}`);
    
    // Create keypair from the wallet address (we'll use the treasury keypair for signing)
    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    
    console.log(`🔑 Using keypair: ${keypair.publicKey.toBase58()}`);

    console.log("🔍 Fetching all claimable positions...");

    // Get all claimable positions for the wallet using Bags SDK
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
        const virtualAmount = Number(position.virtualPoolClaimableAmount) / 1e9;
        console.log(`   💰 Virtual Pool Claimable: ${virtualAmount.toFixed(6)} SOL`);
      }

      if (position.dammPoolClaimableAmount) {
        const dammAmount = Number(position.dammPoolClaimableAmount) / 1e9;
        console.log(`   💰 DAMM Pool Claimable: ${dammAmount.toFixed(6)} SOL`);
      }

      if (position.isCustomFeeVault) {
        const customFeeVaultBalance = Number(position.customFeeVaultBalance) / 1e9;
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

      // Generate claim transactions for this position using Bags SDK
      const claimTransactions = await sdk.fee.getClaimTransaction(
        keypair.publicKey,
        position
      );

      if (!claimTransactions || claimTransactions.length === 0) {
        console.log(`⚠️  No claim transactions generated for this position.`);
        continue;
      }

      console.log(`✨ Generated ${claimTransactions.length} claim transaction(s)`);

      // For testing, we'll just log the transactions without sending them
      console.log(`🔍 Transaction details (not sending for test):`);
      claimTransactions.forEach((tx, index) => {
        console.log(`   Transaction ${index + 1}: ${tx.instructions.length} instructions`);
      });
    }

    console.log("🎉 Fee claiming analysis completed!");
  } catch (error) {
    console.error("🚨 Unexpected error occurred:", error);
  }
}

async function testClaimFees() {
  try {
    console.log('🔄 Starting fee claiming test with Bags SDK...');
    
    // Get fee share wallets for all tokens
    const feeShareWallets = await getFeeShareWallets();
    console.log(`📊 Found ${feeShareWallets.length} fee share wallets`);

    for (const wallet of feeShareWallets) {
      try {
        console.log(`\n💰 Testing wallet: ${wallet.earner_wallet} for token: ${wallet.token_name}`);
        
        // Test claiming fees for this wallet
        await claimFeesForWallet(wallet.earner_wallet, wallet.token_mint, wallet.token_name);

      } catch (walletError) {
        console.error(`❌ Error processing wallet ${wallet.earner_wallet}:`, walletError);
        continue;
      }
    }

    console.log(`\n✅ Fee claiming test completed!`);

  } catch (error) {
    console.error('❌ Fee claiming test failed:', error);
  }
}

// Run the test
testClaimFees();
