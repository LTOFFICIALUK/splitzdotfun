# Supabase Setup Guide

## Environment Variables

Create a `.env.local` file in your project root with only these two variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Setup Steps

1. **Get Your Supabase Credentials**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the "Project URL" and "anon public" key

2. **Run the Database Schema**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/schema.sql`
   - Click "Run" to create the profiles table and storage bucket

3. **Create Storage Bucket** (if not created by schema):
   - Go to Storage in your Supabase dashboard
   - Create a new bucket named `profile-images`
   - Set it to public

That's it! No need for complex authentication, RLS policies, or additional environment variables.

## What This Gives You

- Profile data storage (username, bio, social links)
- Profile image upload and storage
- Simple CRUD operations for profiles
- No complex authentication setup required
