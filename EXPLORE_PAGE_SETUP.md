# Explore Page Setup Guide

This guide will help you set up the explore page system with real-time token data from Jupiter API.

## 1. Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Run the contents of create_explore_page_table.sql
```

This creates the `explore_page` table that will cache token data for fast page loading.

## 2. Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL for GitHub Actions
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

## 3. GitHub Actions Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `EXPLORE_UPDATE_TOKEN`: A secure token for API authentication
- `NEXT_PUBLIC_APP_URL`: Your app's URL (e.g., https://your-app-domain.com)

## 4. API Endpoints

The system includes two main API endpoints:

### `/api/explore-data` (GET)
- Fetches cached explore page data
- Returns tokens categorized as "new", "24h", and "older"
- Includes caching headers for performance

### `/api/update-explore-data` (POST)
- Fetches data from Jupiter API for all tokens
- Updates the explore_page table
- Called by GitHub Actions every minute

## 5. GitHub Actions Workflow

The workflow at `.github/workflows/update-explore-data.yml` will:
- Run every minute
- Call the update API endpoint
- Use the provided authentication token

## 6. Data Flow

1. **GitHub Actions** runs every minute
2. **Update API** fetches all tokens from your database
3. **Jupiter API** provides price, market cap, and volume data
4. **Database** is updated with fresh data
5. **Explore page** loads instantly from cached data

## 7. Token Categories

Tokens are automatically categorized based on:
- **New**: Created within the last 24 hours
- **24h**: Active in the last 7 days with market cap > $10K
- **Older**: Established tokens

## 8. Performance Optimizations

- **Caching**: API responses are cached for 30 seconds
- **Batch Processing**: Tokens are processed in batches of 10
- **Rate Limiting**: 1-second delays between batches
- **Fallback Data**: Uses database data if Jupiter API fails

## 9. Testing

To test the system:

1. **Manual Update**: Visit `/api/update-explore-data` in your browser
2. **Manual Trigger**: Go to GitHub Actions and manually trigger the workflow
3. **Explore Page**: Visit `/explore` to see the updated data

## 10. Monitoring

Check the following for system health:
- GitHub Actions logs for update success/failure
- Supabase logs for database operations
- Browser console for API errors
- Explore page for data freshness

## 11. Troubleshooting

### No data showing
- Check if tokens exist in your `tokens` table
- Verify Jupiter API is accessible
- Check GitHub Actions logs

### Slow updates
- Reduce batch size in the update API
- Increase delays between batches
- Check Jupiter API rate limits

### Authentication errors
- Verify `EXPLORE_UPDATE_TOKEN` is set correctly
- Check API endpoint authorization logic

## 12. Customization

You can customize:
- **Update frequency**: Change the cron schedule in GitHub Actions
- **Batch size**: Modify the `batchSize` variable in the update API
- **Categories**: Adjust the `determineTokenCategory` function
- **Caching**: Modify cache headers in the explore-data API
