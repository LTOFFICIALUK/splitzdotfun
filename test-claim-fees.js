const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { Connection, Keypair, Transaction, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');

// Load environment variables from .env file
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const connection = new Connection(process.env.SOLANA_RPC_URL, process.env.SOLANA_COMMITMENT || 'confirmed');
const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(process.env.TREASURY_PRIVATE_KEY));
const treasuryWallet = new PublicKey(process.env.TREASURY_WALLET_ADDRESS);

async function getFeeShareWallets() {
  try {
    console.log('🔍 Fetching tokens with royalty earners...');
    
    // Get all tokens that have royalty earners
    const { data: tokens, error: tokenError } = await supabase
      .from('tokens')
      .select(`
        id,
        contract_address,
        name,
        token_ownership!inner (
          royalty_earners
        )
      `)
      .not('token_ownership.royalty_earners', 'is', null);

    if (tokenError) {
      console.error('❌ Error fetching tokens:', tokenError);
      return [];
    }

    console.log(`📊 Found ${tokens.length} tokens with royalty earners`);

    const feeShareWallets = [];

    for (const token of tokens) {
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
            
            // Get wallet address for social handle
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

async function getClaimTransaction(position) {
  try {
    console.log(`\n🔍 Getting pool config for wallet: ${position.feeClaimer}`);
    
    // For royalty earners, we need to get the pool config first
    const poolConfigResponse = await fetch(
      'https://public-api-v2.bags.fm/api/v1/state/pool-config-keys-by-fee-claimer-vaults',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.BAGS_API_KEY
        },
        body: JSON.stringify({
          feeClaimer: position.feeClaimer
        })
      }
    );
    
    if (!poolConfigResponse.ok) {
      console.error(`❌ Pool config error: ${poolConfigResponse.status}`);
      const errorText = await poolConfigResponse.text();
      console.error(`Error details:`, errorText);
      return null;
    }
    
    const poolConfigData = await poolConfigResponse.json();
    const poolConfigs = poolConfigData.response || [];
    
    console.log(`📋 Found ${poolConfigs.length} pool configs`);
    
    // Find the pool config for this specific token
    const tokenPoolConfig = poolConfigs.find(config => 
      config.tokenMint === position.tokenMint
    );
    
    if (!tokenPoolConfig) {
      console.warn(`⚠️ No pool config found for token ${position.tokenMint}`);
      return null;
    }
    
    console.log(`✅ Found pool config for token:`, tokenPoolConfig);
    
    // Generate claim transaction with the pool config data
    const response = await fetch(
      'https://public-api-v2.bags.fm/api/v1/token-launch/claim-txs',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.BAGS_API_KEY
        },
        body: JSON.stringify({
          feeClaimer: position.feeClaimer,
          tokenMint: position.tokenMint,
          virtualPoolAddress: tokenPoolConfig.virtualPoolAddress,
          dammV2Position: tokenPoolConfig.dammV2Position,
          dammV2Pool: tokenPoolConfig.dammV2Pool,
          dammV2PositionNftAccount: tokenPoolConfig.dammV2PositionNftAccount,
          tokenAMint: tokenPoolConfig.tokenAMint,
          tokenBMint: tokenPoolConfig.tokenBMint,
          tokenAVault: tokenPoolConfig.tokenAVault,
          tokenBVault: tokenPoolConfig.tokenBVault,
          claimVirtualPoolFees: true,
          claimDammV2Fees: true,
          isCustomFeeVault: tokenPoolConfig.isCustomFeeVault || false,
          customFeeVaultClaimerA: tokenPoolConfig.customFeeVaultClaimerA,
          customFeeVaultClaimerB: tokenPoolConfig.customFeeVaultClaimerB,
          customFeeVaultClaimerSide: tokenPoolConfig.customFeeVaultClaimerSide
        })
      }
    );
    
    if (!response.ok) {
      console.error(`❌ Bags API error: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details:`, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ Generated claim transaction:`, data);
    return data.response[0]?.tx; // Return the transaction data
  } catch (error) {
    console.error('❌ Error getting claim transaction:', error);
    return null;
  }
}

async function testClaimFees() {
  try {
    console.log('🔄 Starting fee claiming test...');
    
    // Get fee share wallets for all tokens
    const feeShareWallets = await getFeeShareWallets();
    console.log(`📊 Found ${feeShareWallets.length} fee share wallets`);

    for (const wallet of feeShareWallets) {
      try {
        console.log(`\n💰 Processing wallet: ${wallet.earner_wallet} for token: ${wallet.token_name}`);
        
        // Get claim transaction for this wallet
        const claimTransaction = await getClaimTransaction({
          feeClaimer: wallet.earner_wallet,
          tokenMint: wallet.token_mint
        });
        
        if (!claimTransaction) {
          console.warn(`⚠️ No claim transaction generated for wallet ${wallet.earner_wallet}`);
          continue;
        }

        console.log(`✅ Successfully generated claim transaction for ${wallet.earner_wallet}`);
        console.log(`📝 Transaction data length: ${claimTransaction.length} characters`);

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
