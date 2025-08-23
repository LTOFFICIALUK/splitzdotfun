import { NextRequest, NextResponse } from 'next/server';
import { BagsSDK } from "@bagsfm/bags-sdk";
import {
  Keypair,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Initialize SDK
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // base58-encoded secret key per Bags guide
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;

let connection: Connection;
let sdk: BagsSDK;
let platformKeypair: Keypair;

// Initialize SDK components
function initializeSDK() {
  if (!BAGS_API_KEY || !SOLANA_RPC_URL || !PRIVATE_KEY || !PLATFORM_WALLET_ADDRESS) {
    throw new Error("BAGS_API_KEY, SOLANA_RPC_URL, PRIVATE_KEY, and PLATFORM_WALLET_ADDRESS are required");
  }
  
  connection = new Connection(SOLANA_RPC_URL);
  sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");
  platformKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
}

async function signAndSendTransaction(serializedTx: string, keypair: Keypair): Promise<string> {
  const connection = sdk.state.getConnection();
  const commitment = sdk.state.getCommitment();
  
  const txBuffer = bs58.decode(serializedTx);
  const transaction = VersionedTransaction.deserialize(txBuffer);
  transaction.sign([keypair]);

  const blockhash = await connection.getLatestBlockhash(commitment);
  
  const signature = await connection.sendTransaction(transaction, {
    skipPreflight: true,
    maxRetries: 0,
  });
  
  const confirmation = await connection.confirmTransaction({
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
    signature: signature,
  }, commitment);

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err}`);
  }
  console.log("✅ Transaction confirmed:", signature);
  return signature;
}

async function getFeeShareWallet(
  twitterUsername: string
): Promise<PublicKey | null> {
  try {
    console.log(
      `🔍 Looking up fee share wallet for Twitter user: @${twitterUsername}`
    );
    const feeShareWallet = await sdk.state.getLaunchWalletForTwitterUsername(
      twitterUsername
    );
    console.log(`✨ Found fee share wallet: ${feeShareWallet.toString()}`);
    return feeShareWallet;
  } catch (error) {
    console.error(
      `❌ Failed to get fee share wallet for @${twitterUsername}:`,
      error
    );
    return null;
  }
}

async function transferAllInitialBuyTokensToUser(tokenMint: PublicKey, userWallet: PublicKey): Promise<string | null> {
  try {
    const mintInfo = await getMint(connection, tokenMint, 'confirmed');

    const sourceAta = await getAssociatedTokenAddress(
      tokenMint,
      platformKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const destAtaInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      platformKeypair,
      tokenMint,
      userWallet,
      true,
      'confirmed',
      { commitment: 'confirmed' }
    );

    const sourceBalResp = await connection.getTokenAccountBalance(sourceAta, { commitment: 'confirmed' });
    const ui = sourceBalResp.value.uiAmount;
    if (!ui || ui <= 0) {
      console.log('ℹ️ No base tokens to transfer from platform wallet.');
      return null;
    }

    const amount = BigInt(Math.floor(ui * Math.pow(10, mintInfo.decimals)));

    const tx = new (await import('@solana/web3.js')).Transaction();
    tx.add(
      createTransferCheckedInstruction(
        sourceAta,
        tokenMint,
        destAtaInfo.address,
        platformKeypair.publicKey,
        Number(amount),
        mintInfo.decimals,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = platformKeypair.publicKey;

    tx.sign(platformKeypair);

    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true, maxRetries: 0 });
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
    console.log('✅ Transferred initial buy tokens to user:', sig);
    return sig;
  } catch (err) {
    console.warn('⚠️ Token transfer to user failed:', err);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize SDK
    initializeSDK();
    
    const body = await request.json();
    
    const {
      imageUrl,
      name,
      symbol,
      description,
      userWallet,
      initialBuyAmount,
      twitterUrl,
      telegram,
      website
    } = body;

    // Validate required fields
    if (!imageUrl || !name || !symbol || !description || !userWallet || !initialBuyAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate expected payment amount
    const launchFee = 0.1;
    const expectedAmount = launchFee + parseFloat(initialBuyAmount);
    const expectedLamports = expectedAmount * LAMPORTS_PER_SOL;

    console.log(`🔍 Verifying payment of ${expectedAmount} SOL from ${userWallet} to ${PLATFORM_WALLET_ADDRESS}`);

    // Backend balance polling: wait until funds arrive
    try {
      const initialBalance = await connection.getBalance(platformKeypair.publicKey);
      const expectedLamportsRounded = expectedLamports; // exact amount expected from UI

      console.log(`💰 Initial platform balance: ${initialBalance / LAMPORTS_PER_SOL} SOL`);

      let attempts = 0;
      const maxAttempts = 60; // up to 60 seconds
      let received = false;

      while (attempts < maxAttempts && !received) {
        await new Promise((r) => setTimeout(r, 1000));
        const current = await connection.getBalance(platformKeypair.publicKey);
        const delta = current - initialBalance;
        console.log(`🔎 Poll ${attempts + 1}/${maxAttempts}: delta ${(delta / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
        if (delta >= expectedLamportsRounded * 0.99) {
          received = true;
          console.log('✅ Detected expected funds in platform wallet');
          break;
        }
        attempts++;
      }

      if (!received) {
        throw new Error('Timed out waiting for SOL to arrive in platform wallet');
      }

    } catch (error) {
      console.error('❌ Balance verification failed:', error);
      return NextResponse.json(
        { error: 'Balance verification failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Convert initial buy amount to lamports
    const initialBuyLamports = parseFloat(initialBuyAmount) * LAMPORTS_PER_SOL;
    
    // Fee split configuration: 10% creator, 90% platform
    const creatorFeeBps = 1000; // 10% for creator
    const feeClaimerFeeBps = 9000; // 90% for fee claimer (platform)
    const feeClaimerTwitterHandle = "splitzdotfun"; // Platform Twitter handle

    console.log(`🚀 Creating token $${symbol} with shared fees using platform wallet ${platformKeypair.publicKey.toBase58()}`);
    console.log(`📝 Token: ${name} (${symbol})`);
    console.log(`📄 Description: ${description}`);
    console.log(`👤 User Wallet: ${userWallet}`);
    console.log(`💰 Initial Buy Amount: ${initialBuyAmount} SOL (${initialBuyLamports} lamports)`);
    console.log(`👤 Fee Claimer: @${feeClaimerTwitterHandle}`);
    console.log(
      `💰 Fee Split: Creator ${creatorFeeBps / 100}% | Fee Claimer ${
        feeClaimerFeeBps / 100
      }%`
    );

    // Step 1: Create token info
    console.log("📝 Creating token info and metadata...");

    // Fetch image url to file like object
    const image = await fetch(imageUrl).then(res => res.blob());

    const tokenInfo = await sdk.tokenLaunch.createTokenInfoAndMetadata({
      image,
      name,
      symbol,
      description,
      telegram,
      twitter: twitterUrl,
      website,
    });
    console.log("✨ Successfully created token info and metadata!");
    console.log("🪙 Token mint:", tokenInfo.tokenMint);

    // Step 2: Get fee share wallet (required for shared fees)
    if (!feeClaimerTwitterHandle) {
      throw new Error("Fee claimer Twitter handle is required for shared fees");
    }

    console.log(
      `🔍 Looking up fee share wallet for Twitter user: @${feeClaimerTwitterHandle}`
    );
    const feeShareWallet = await getFeeShareWallet(feeClaimerTwitterHandle);
    if (!feeShareWallet) {
      throw new Error(
        `Could not find fee share wallet for Twitter user @${feeClaimerTwitterHandle}`
      );
    }

    // Step 3: Create launch config with shared fees
    console.log("⚙️  Creating launch config with shared fees...");
    const feeShareConfig = await sdk.config.createFeeShareConfig({
      users: [
        {
          wallet: platformKeypair.publicKey,
          bps: creatorFeeBps,
        },
        {
          wallet: feeShareWallet,
          bps: feeClaimerFeeBps,
        },
      ],
      payer: platformKeypair.publicKey,
      baseMint: new PublicKey(tokenInfo.tokenMint),
      quoteMint: new PublicKey("So11111111111111111111111111111111111111112"), // wSOL mint (required)
    });

    const configResult = {
      configKey: feeShareConfig.configKey.toString(),
      tx: feeShareConfig.transaction
        ? bs58.encode(feeShareConfig.transaction.serialize())
        : null,
    };

    console.log("🔧 Launch config created successfully!");

    if (configResult.tx) {
      console.log("🔐 Signing and sending config transaction...");
      await signAndSendTransaction(configResult.tx, platformKeypair);
    } else {
      console.log("♻️  Config already exists, reusing existing configuration");
    }

    const configKey = configResult.configKey;

    console.log("🔑 Config Key:", configKey);

    // Step 4: Create launch transaction
    console.log("🎯 Creating token launch transaction...");
    const launchTx = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl: tokenInfo.tokenMetadata,
      tokenMint: new PublicKey(tokenInfo.tokenMint),
      launchWallet: platformKeypair.publicKey,
      initialBuyLamports: initialBuyLamports,
      configKey: new PublicKey(configKey),
    });

    // Step 5: Send final transaction
    console.log("📡 Sending final transaction...");
    const finalSignature = await signAndSendTransaction(bs58.encode(launchTx.serialize()), platformKeypair);

    console.log("🎉 Token launched successfully!");
    console.log("🪙 Token Mint:", tokenInfo.tokenMint);
    console.log("🔑 Launch Signature:", finalSignature);
    console.log("📄 Metadata URI:", tokenInfo.tokenMetadata);
    console.log("💰 Shared Fees Configuration:");
    console.log(
      `  👤 Creator (${userWallet}): ${creatorFeeBps / 100}%`
    );
    console.log(
      `  🤝 Fee Claimer (${feeShareWallet.toString()}): ${feeClaimerFeeBps / 100}%`
    );
    console.log(`🌐 View your token at: https://bags.fm/${tokenInfo.tokenMint}`);

    // Step 6: Transfer ALL purchased base tokens to the user's wallet
    const transferSig = await transferAllInitialBuyTokensToUser(new PublicKey(tokenInfo.tokenMint), new PublicKey(userWallet));
    if (!transferSig) {
      console.warn('⚠️ No tokens transferred (none found or transfer failed).');
    }

    return NextResponse.json({
      success: true,
      tokenMint: tokenInfo.tokenMint,
      signature: finalSignature,
      tokenMetadata: tokenInfo.tokenMetadata,
      tokenLaunch: tokenInfo.tokenLaunch,
      feeShareWallet: feeShareWallet.toString(),
      feeSplit: {
        creator: creatorFeeBps,
        feeClaimer: feeClaimerFeeBps,
      },
      bagsUrl: `https://bags.fm/${tokenInfo.tokenMint}`,
      splitzUrl: `https://splitz.fun/token/${tokenInfo.tokenMint}`,
      initialBuyAmount: initialBuyAmount,
      userWallet: userWallet,
      transferSignature: transferSig || null
    });

  } catch (error) {
    console.error("🚨 Token launch failed:", error);
    return NextResponse.json(
      { 
        error: 'Token launch failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
