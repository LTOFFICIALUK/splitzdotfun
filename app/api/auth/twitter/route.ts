import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This will contain the wallet address and code verifier
  
  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=missing_params`);
  }

  // Parse state to get wallet address and code verifier
  let walletAddress: string;
  let codeVerifier: string;
  
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    walletAddress = stateData.wallet;
    codeVerifier = stateData.code_verifier;
  } catch (error) {
    // Fallback for old format where state was just the wallet address
    walletAddress = state;
    codeVerifier = 'challenge'; // Fallback code verifier
  }

  try {
    console.log('Twitter OAuth callback received:', { code, walletAddress, codeVerifier });
    
    // Exchange code for access token
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.TWITTER_REDIRECT_URI!,
      code_verifier: codeVerifier
    });
    
    console.log('Token request body:', tokenRequestBody.toString());
    
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: tokenRequestBody
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Twitter token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Twitter user info failed:', await userResponse.text());
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=user_info_failed`);
    }

    const userData = await userResponse.json();
    const username = userData.data.username;

    // Update the user's profile with verification status
    const { error } = await supabase.rpc('update_oauth_verification', {
      wallet_address: walletAddress,
      platform: 'X',
      is_verified: true,
      oauth_token: tokenData.access_token
    });

    if (error) {
      console.error('Database update failed:', error);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=database_update_failed`);
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?verified=X&username=${username}`);

  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=oauth_failed`);
  }
}
