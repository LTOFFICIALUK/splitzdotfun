# Storage Bucket Setup Guide

## Current Issue
The console shows `All available buckets: []` even though the bucket exists in the database. This is likely due to missing storage permissions or RLS policies.

## Solution Options

### Option 1: Dashboard Setup (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click on "Storage" in the left sidebar

2. **Delete and Recreate the Bucket**
   - If the bucket exists, delete it first
   - Click "Create a new bucket"

3. **Configure the Bucket**
   - **Name**: `profile-images`
   - **Public bucket**: Check this box
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png` 
     - `image/gif`
     - `image/webp`

4. **Save the Bucket**
   - Click "Create bucket"

### Option 2: SQL Script (Simplified)

1. **Go to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

2. **Run the Simplified Script**
   - Copy and paste the contents of `fix-storage-permissions.sql`
   - Click "Run" to execute

3. **Check the Results**
   - Verify the bucket was created successfully
   - Check if RLS is enabled on storage.objects

### Option 3: Manual Storage Policy Setup

If the above options don't work, you may need to:

1. **Go to Authentication > Policies**
   - Look for storage policies
   - Ensure there are policies allowing public access to the bucket

2. **Check Storage Settings**
   - Go to Settings > API
   - Verify your API keys have storage permissions

## Testing

After setting up the bucket:

1. **Refresh your app** or restart the development server
2. **Try uploading a profile picture**
3. **Check the console** for:
   - `All available buckets: [{ name: "profile-images", public: true }]`
   - `Found profile-images bucket: {...}`
   - `Upload successful`
   - `Public URL generated: https://...`

## Troubleshooting

If you still see `All available buckets: []`:

1. **Check your Supabase project** - Make sure you're in the correct project
2. **Verify environment variables** - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
3. **Check bucket permissions** - The bucket must be public for the client to access it
4. **Try the dashboard approach** - Sometimes manual creation works better than SQL
5. **Contact Supabase support** - If none of the above work, there might be a project-level issue
