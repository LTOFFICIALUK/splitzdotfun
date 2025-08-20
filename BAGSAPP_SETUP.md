# BagsApp API Integration Setup Guide

This guide explains how to set up the BagsApp API integration for token launching on SplitzFun.

## Prerequisites

1. **BagsApp API Key**: Get your API key from [dev.bags.fm](https://dev.bags.fm)
2. **Solana Wallet**: Any Solana-compatible wallet (Phantom, Solflare, etc.)
3. **SOL Balance**: At least 0.05 SOL for deployment fees

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# BagsApp API Configuration
BAGS_API_KEY=your_bags_api_key_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Optional: For development/testing
NODE_ENV=development
```

## Installation

The required dependencies are already installed:

```bash
npm install @bagsfm/bags-sdk @solana/web3.js bs58
```

## How It Works

### 1. Token Creation Flow

1. User visits `/create` page
2. Fills out token details (name, symbol, description, images)
3. Configures royalty distribution
4. Clicks "Launch Token"
5. Frontend calls `/api/launch-token` endpoint
6. Backend integrates with BagsApp API
7. Token is created with hardcoded X receiver (`@splitzdotfun`)
8. User is redirected to token page

### 2. Hardcoded Values

- **X Receiver**: All tokens automatically route 100% of X royalties to `@splitzdotfun`
- **Website URL**: Each token gets a unique URL: `https://splitz.fun/token/{token_id}`

### 3. API Parameters

The BagsApp API receives the following parameters:

```typescript
{
  imageUrl: string,           // Token image URL
  name: string,              // Token name
  symbol: string,            // Token symbol
  description: string,       // Token description
  twitterUrl: string,        // Twitter/X URL
  websiteUrl: string,        // Generated website URL
  initialBuyAmountLamports: number,  // Initial buy amount in lamports
  xReceiver: '@splitzdotfun',        // Hardcoded X receiver
  xReceiverPercentage: 100           // Hardcoded 100% allocation
}
```

## Security Considerations

- **Private Keys**: Never stored on the server
- **API Keys**: Stored securely in environment variables
- **Wallet Signing**: All transactions signed on client side
- **OAuth Flows**: Secure social media authentication

## Testing

For development/testing, the API includes a demo mode that simulates token creation without making actual blockchain transactions.

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `BAGS_API_KEY` is set in environment variables
2. **Invalid Wallet**: Check that wallet address format is correct
3. **Insufficient SOL**: Ensure wallet has at least 0.05 SOL for fees
4. **Network Issues**: Check Solana RPC URL and network connectivity

### Error Messages

- `"BAGS_API_KEY environment variable is required"`: Set your API key
- `"Invalid wallet address format"`: Check wallet address
- `"Missing required fields"`: Fill in all required form fields
- `"Transaction failed to confirm"`: Network or fee issues

## Production Deployment

1. Set production environment variables
2. Use production Solana RPC endpoint
3. Ensure proper error handling and logging
4. Test with small amounts first
5. Monitor transaction success rates

## Support

For BagsApp API support, visit:
- [BagsApp Documentation](https://bags.mintlify.app/)
- [BagsApp Developer Portal](https://dev.bags.fm)
- [BagsApp Support](https://support.bags.fm)
