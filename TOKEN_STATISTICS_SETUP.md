# Token Statistics System Setup

This document explains how to set up and use the token statistics system that automatically fetches and stores Jupiter API data for all tokens on the platform.

## Overview

The token statistics system consists of:
1. A `token_statistics` table to store Jupiter API data
2. An API route that fetches all tokens and updates their statistics
3. A cron job that runs every 5 minutes to keep data fresh
4. An API route to fetch statistics for frontend use

## Database Setup

### 1. Create the token_statistics table

Run the SQL in `create_token_stats_table.sql`:

```sql
-- Execute this in your Supabase SQL editor
\i create_token_stats_table.sql
```

This creates a table with all the fields from the Jupiter API response, properly indexed for efficient querying.

## Environment Variables

Add these to your Vercel environment variables:

```bash
# Required for cron job security
CRON_SECRET=your-secret-key-here

# Existing variables (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## API Routes

### 1. `/api/update-token-statistics` (GET)
- **Purpose**: Fetches all tokens from database and updates their Jupiter statistics
- **Cron Job**: Runs every 5 minutes automatically
- **Security**: Requires `Authorization: Bearer {CRON_SECRET}` header
- **Features**:
  - Processes tokens in batches of 10 to avoid overwhelming Jupiter API
  - Includes 1-second delays between batches
  - Comprehensive error handling and logging
  - Returns detailed success/failure statistics

### 2. `/api/token-statistics` (GET)
- **Purpose**: Fetch token statistics for frontend use
- **Query Parameters**:
  - `contract_address`: Filter by specific token
  - `limit`: Number of results (default: 50)
  - `offset`: Pagination offset (default: 0)
  - `sort_by`: Sort field (mcap, liquidity, holder_count, fdv, usd_price, created_at)
  - `sort_order`: asc or desc (default: desc)
  - `min_liquidity`: Minimum liquidity filter
  - `min_holders`: Minimum holder count filter
  - `verified_only`: Only verified tokens (true/false)

### 3. `/api/manual-update-statistics` (POST)
- **Purpose**: Manually trigger a statistics update (for testing)
- **No authentication required** (for testing purposes)

## Cron Job Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/update-token-statistics",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs every 5 minutes. The cron expression `*/5 * * * *` means:
- `*/5`: Every 5 minutes
- `*`: Any hour
- `*`: Any day of month
- `*`: Any month
- `*`: Any day of week

## Usage Examples

### Fetch all token statistics (sorted by market cap)
```bash
GET /api/token-statistics?sort_by=mcap&sort_order=desc&limit=20
```

### Fetch statistics for a specific token
```bash
GET /api/token-statistics?contract_address=dWd8vyAH9pQMMG1bkQWiGnyx8LjjuTDHsk8qcsCBAGS
```

### Fetch only verified tokens with high liquidity
```bash
GET /api/token-statistics?verified_only=true&min_liquidity=10000&sort_by=liquidity&sort_order=desc
```

### Manually trigger an update
```bash
POST /api/manual-update-statistics
```

## Data Structure

The `token_statistics` table stores:

### Basic Token Info
- `jupiter_id`, `name`, `symbol`, `icon`, `decimals`
- `dev`, `circ_supply`, `total_supply`
- `token_program`, `launchpad`, `meta_launchpad`

### Financial Data
- `fdv` (Fully Diluted Valuation)
- `mcap` (Market Cap)
- `usd_price`, `liquidity`
- `holder_count`

### Audit & Security
- `mint_authority_disabled`, `freeze_authority_disabled`
- `top_holders_percentage`, `dev_migrations`
- `organic_score`, `is_verified`, `tags`

### Time-based Statistics
- `stats_5m`, `stats_1h`, `stats_6h`, `stats_24h` (JSONB)
- Each contains: price change, volume, trades, traders, etc.

### Social Data
- `ct_likes`, `smart_ct_likes`

## Performance Considerations

1. **Batch Processing**: Tokens are processed in batches of 10 to avoid overwhelming Jupiter API
2. **Rate Limiting**: 1-second delays between batches
3. **Indexing**: Proper database indexes on frequently queried fields
4. **Upsert Logic**: Uses `ON CONFLICT` to efficiently update existing records
5. **Error Handling**: Comprehensive error handling with detailed logging

## Monitoring

### Vercel Logs
Monitor the cron job execution in Vercel dashboard:
1. Go to your project in Vercel
2. Navigate to "Functions" tab
3. Look for `/api/update-token-statistics` function
4. Check execution logs and performance metrics

### Database Monitoring
Monitor the `token_statistics` table:
```sql
-- Check last update times
SELECT 
  contract_address,
  jupiter_updated_at,
  updated_at,
  mcap,
  liquidity,
  holder_count
FROM token_statistics 
ORDER BY updated_at DESC 
LIMIT 10;
```

## Troubleshooting

### Common Issues

1. **Cron job not running**
   - Check Vercel cron job configuration
   - Verify `CRON_SECRET` environment variable is set
   - Check Vercel function logs

2. **Jupiter API errors**
   - Some tokens may not have Jupiter data
   - Network issues are handled gracefully
   - Check logs for specific error details

3. **Database errors**
   - Verify `token_statistics` table exists
   - Check Supabase connection and permissions
   - Ensure service role key has proper permissions

### Debug Commands

```bash
# Test the update API manually
curl -X POST https://your-domain.vercel.app/api/manual-update-statistics

# Check token statistics
curl "https://your-domain.vercel.app/api/token-statistics?limit=5"
```

## Security Notes

1. **Cron Secret**: Always set a `CRON_SECRET` environment variable
2. **Service Role Key**: The update API uses Supabase service role key for database access
3. **Rate Limiting**: Built-in delays prevent overwhelming external APIs
4. **Error Handling**: Sensitive data is not exposed in error messages

## Future Enhancements

Potential improvements:
1. **Webhook Support**: Notify external systems when statistics update
2. **Historical Data**: Store historical price/volume data
3. **Caching**: Add Redis caching for frequently accessed data
4. **Analytics**: Add analytics dashboard for token performance
5. **Alerts**: Set up alerts for significant price/volume changes
