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

  // For now, use state as wallet address and a fallback code verifier
  // This is a temporary solution to get the OAuth working
  const walletAddress = state;
  const codeVerifier = 'challenge'; // Fallback code verifier

  try {
    console.log('Twitter OAuth callback received:', { 
    code: code ? code.substring(0, 10) + '...' : 'undefined',
    walletAddress, 
    codeVerifier: codeVerifier ? codeVerifier.substring(0, 10) + '...' : 'undefined',
    codeVerifierLength: codeVerifier ? codeVerifier.length : 0
  });
    
    // Exchange code for access token
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID!,
      code,
      redirect_uri: 'https://splitz.fun/api/auth/twitter', // Must match the authorization request
      code_verifier: codeVerifier
    });
    
    console.log('Token request body:', tokenRequestBody.toString());
    console.log('Client ID:', process.env.TWITTER_CLIENT_ID);
    console.log('Client Secret (first 10 chars):', process.env.TWITTER_CLIENT_SECRET ? process.env.TWITTER_CLIENT_SECRET.substring(0, 10) + '...' : 'undefined');
    console.log('Redirect URI:', process.env.TWITTER_REDIRECT_URI);
    
    // X OAuth 2.0 PKCE flow requires Basic auth header with client credentials
    // https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
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
        error: errorText,
        headers: Object.fromEntries(tokenResponse.headers.entries())
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
