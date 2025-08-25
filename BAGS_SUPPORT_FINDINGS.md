# BAGS Fee Claiming Issue - Technical Findings

## Problem Summary
We are unable to successfully claim fees using the BAGS SDK due to **consistently expired blockhashes** in transactions returned by both the SDK and HTTP API.

## What We've Tried

### 1. SDK Approach (Following BAGS Documentation)
- Used `sdk.fee.getAllClaimablePositions()` and `sdk.fee.getClaimTransaction()`
- **Result**: `TransactionExpiredBlockheightExceededError`

### 2. HTTP API Approach
- Used `https://public-api-v2.bags.fm/api/v1/token-launch/claim-txs`
- **Result**: `Blockhash not found` errors

### 3. Blockhash Update Approach (Per BAGS Support)
- Updated transaction blockhash with fresh blockhash before signing
- **Result**: `Transaction signature verification failure`

### 4. Multi-Signer Approach
- Identified transaction requires 2 signatures
- Tried signing with both treasury and secondary wallets
- **Result**: `Cannot sign with non signer key` (secondary wallet not required)

### 5. Fresh Transaction Approach
- Requested new transactions from SDK
- **Result**: Still received transactions with expired blockhashes

## Technical Details

### Transaction Structure
- **Required signatures**: 2
- **Readonly signed accounts**: 0
- **Blockhash expiration**: Consistently expired (60+ seconds old)

### Example Error Logs
```
🆕 Fresh blockhash: AEe5ArkJKvZgc1pWrBewWh2NKDBBEPvbwddaB8sg7vXR (valid until 340476578)
🔍 Fresh transaction details:
   - Blockhash: DRZTH1N5AMh2drqBFZcJEq9gwLkULQo9NtinyHYwA4V4
   - Result: Blockhash not found
```

### RPC Configuration
- **Provider**: Helius (https://mainnet.helius-rpc.com/)
- **Commitment**: `processed` (tried `confirmed` as well)
- **Timeout**: 10-30 seconds

## Root Cause Analysis

The issue appears to be **server-side** in BAGS's transaction generation:

1. **BAGS SDK/API consistently returns transactions with expired blockhashes**
2. **Blockhashes are 60+ seconds old when received**
3. **No amount of client-side blockhash updating resolves the signature verification issues**
4. **Fresh transaction requests still return expired blockhashes**

## Recommendations

### For BAGS Support
1. **Fix server-side blockhash generation** to use current blockhashes
2. **Implement blockhash refresh logic** in the SDK/API
3. **Add blockhash validity checks** before returning transactions

### For Our Implementation
1. **Continue using GitHub Actions** with current script (will retry automatically)
2. **Monitor for BAGS fixes** and update when available
3. **Consider manual claiming** as temporary workaround

## Current Status
- ✅ **Script is functionally correct** (follows BAGS documentation)
- ✅ **GitHub Actions workflow configured** (runs every 6 hours)
- ❌ **Transactions consistently fail** due to expired blockhashes
- 🔄 **Automatic retry mechanism** in place

## Files Created
- `scripts/claim-fees-fresh-transaction.ts` - Main script
- `.github/workflows/claim-fees.yml` - GitHub Actions workflow
- Various test scripts for different approaches

## Environment Variables Required
- `BAGS_API_KEY`
- `TREASURY_PRIVATE_KEY`
- `SECONDARY_WALLET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
