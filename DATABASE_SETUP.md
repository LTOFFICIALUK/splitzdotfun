# Database Setup Guide

## Prerequisites
- Supabase project created
- Environment variables configured

## Required Environment Variables
Make sure these are set in your `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Tables Setup

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section

### Step 2: Create Tables
Copy and paste the entire contents of `create_tokens_tables.sql` into the SQL editor and run it.

This will create:
- `tokens` table - stores token information
- `token_ownership` table - stores ownership and royalty data
- Required indexes and triggers

### Step 3: Verify Tables
After running the SQL, you should see:
- Two new tables in the "Table Editor"
- Proper relationships between tables
- Indexes for performance

### Step 4: Test Connection
The `/projects` page should now work without 500 errors.

## Troubleshooting

### Error: "Database tables not found"
- Make sure you've run the SQL script in Supabase
- Check that environment variables are correct
- Verify Supabase project is active

### Error: "Database configuration error"
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Ensure the service role key has proper permissions

### Error: "Database connection failed"
- Check your internet connection
- Verify Supabase project is not paused
- Check Supabase status page for any outages

## Next Steps
After tables are created:
1. Launch a token to test the save functionality
2. Check `/projects` page to see real data
3. Verify token data is being saved correctly
