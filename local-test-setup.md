# Local Testing Setup

## 1. Install Dependencies
```bash
npm install @supabase/supabase-js node-fetch @solana/web3.js bs58 dotenv @bagsfm/bags-sdk
```

## 2. Create .env File
Create a `.env` file in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Bags API
BAGS_API_KEY=your_bags_api_key_here

# Solana Configuration (for other scripts)
SOLANA_RPC_URL=your_current_rpc_url_here
SOLANA_COMMITMENT=confirmed

# Bags-specific RPC (for Bags SDK testing)
BAGS_SOLANA_RPC_URL=https://solana-mainnet.rpc.extrnode.com

# Treasury Wallet (Bags-assigned wallet for your X account)
TREASURY_WALLET_ADDRESS=4rQSE2L8SmE6Doe3FggaDnUvaXeySfvSDtMx1xpPHN2a
TREASURY_PRIVATE_KEY=4DNmLxoKiq11HE22LvwrHGquog2u7TGCQpXv8pJU3bCHiqqagxAxnBv7QDzcoyrB2oMxr4RZFMz7CsGg4aVw4TGi
```

## 3. Run the Test
```bash
node test-claim-fees-sdk.js
```

## 4. What to Look For
- ✅ JSON parsing of royalty_earners
- ✅ Finding your @splitzdotfun account
- ✅ Getting your Bags wallet address
- ✅ Pool config lookup
- ✅ Claim transaction generation

## 5. Debug Steps
If you see errors, the script will show detailed logs to help identify the issue.

## 6. RPC Endpoint Options
If you still get RPC errors, try these alternative endpoints:
- `https://solana-mainnet.rpc.extrnode.com` (recommended)
- `https://rpc.ankr.com/solana`
- `https://solana-api.projectserum.com`
- `https://api.mainnet-beta.solana.com` (rate limited)
