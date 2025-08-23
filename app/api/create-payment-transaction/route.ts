import { NextRequest, NextResponse } from 'next/server';
import {
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;

let connection: Connection;

// Initialize connection
function initializeConnection() {
  if (!PLATFORM_WALLET_ADDRESS) {
    throw new Error("PLATFORM_WALLET_ADDRESS is required");
  }
  
  connection = new Connection(SOLANA_RPC_URL);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize connection
    initializeConnection();
    
    const body = await request.json();
    
    const {
      userWallet,
      initialBuyAmount
    } = body;

    // Validate required fields
    if (!userWallet || !initialBuyAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total payment amount
    const launchFee = 0.1; // 0.1 SOL for launch costs
    const totalAmount = launchFee + parseFloat(initialBuyAmount);
    const totalLamports = totalAmount * LAMPORTS_PER_SOL;

    console.log(`💰 Creating payment transaction for ${totalAmount} SOL`);
    console.log(`👤 From: ${userWallet}`);
    console.log(`🎯 To: ${PLATFORM_WALLET_ADDRESS}`);
    console.log(`📊 Breakdown: ${launchFee} SOL (launch fee) + ${initialBuyAmount} SOL (initial buy)`);
    console.log(`💡 Platform will handle all network fees and transaction costs`);

    // Create the transaction
    const transaction = new Transaction();
    
    // Add transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(userWallet),
      toPubkey: new PublicKey(PLATFORM_WALLET_ADDRESS!),
      lamports: totalLamports,
    });
    
    transaction.add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(userWallet);

    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log("✅ Payment transaction created successfully");

    return NextResponse.json({
      success: true,
      transaction: Buffer.from(serializedTransaction).toString('base64'),
      amount: totalAmount,
      breakdown: {
        launchFee: launchFee,
        initialBuy: parseFloat(initialBuyAmount),
        total: totalAmount
      },
      platformWallet: PLATFORM_WALLET_ADDRESS
    });

  } catch (error) {
    console.error("🚨 Failed to create payment transaction:", error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment transaction', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
