# Scripts Directory

This directory contains utility scripts for the Splitz platform.

## Claim Fees Script

The `claim-fees.ts` script allows you to test the fee claiming functionality locally before deploying to GitHub Actions.

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in your `.env.local` file:
   ```bash
   BAGS_API_KEY=your_bags_api_key_here
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   TREASURY_PRIVATE_KEY=your_base58_encoded_private_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

### Running the Script

You can run the fee claiming script locally using:

```bash
npm run claim-fees
```

Or directly with ts-node:

```bash
npx ts-node scripts/claim-fees.ts
```

### What the Script Does

1. **Fetches Tokens with Royalty Earners**: Queries your Supabase database for all tokens that have royalty earners configured
2. **Resolves Social Handles**: Converts Twitter handles to wallet addresses using the Bags API
3. **Claims Fees**: Uses the Bags SDK to claim fees for each token using the treasury wallet
4. **Records Transactions**: Logs all successful claims to your `bags_claims` table
5. **Tracks Job Runs**: Records job execution details in your `job_runs` table

### Testing vs Production

- **Local Testing**: The script will actually send transactions to the Solana network, so use a test wallet or small amounts
- **GitHub Actions**: The same script runs automatically every hour via the workflow in `.github/workflows/claim-fees.yml`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BAGS_API_KEY` | Your Bags API key from the developer portal | Yes |
| `SOLANA_RPC_URL` | Solana RPC endpoint URL | Yes |
| `TREASURY_PRIVATE_KEY` | Base58 encoded private key for the treasury wallet | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for database access | Yes |

### Troubleshooting

- **No claimable positions**: This is normal if your wallet doesn't have any fee-generating positions
- **API errors**: Check your Bags API key and ensure it has the necessary permissions
- **Database errors**: Verify your Supabase credentials and ensure the required tables exist
- **Transaction failures**: Check your Solana RPC endpoint and wallet balance

### Safety Notes

⚠️ **Important**: This script will send real transactions to the Solana network. Always test with a small amount first and ensure your environment variables are secure.
