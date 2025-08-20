import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  console.log('GitHub OAuth callback received request:', request.url);
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This will contain the wallet address
  
  console.log('GitHub OAuth callback parameters:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing' });
  
  if (!code || !state) {
    console.error('GitHub OAuth missing parameters:', { code: !!code, state: !!state });
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=missing_params`);
  }

  try {
    console.log('GitHub OAuth callback received:', { 
      code: code ? code.substring(0, 10) + '...' : 'undefined',
      state,
      clientId: process.env.GITHUB_CLIENT_ID,
      redirectUri: process.env.GITHUB_REDIRECT_URI
    });

    // Exchange code for access token
    const tokenRequestBody = {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI
    };

    console.log('GitHub token request body:', JSON.stringify(tokenRequestBody, null, 2));

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestBody)
    });

    if (!tokenResponse.ok) {
      console.error('GitHub token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error_description);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=token_exchange_failed`);
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      console.error('GitHub user info failed:', await userResponse.text());
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=user_info_failed`);
    }

    const userData = await userResponse.json();
    const username = userData.login;

    // Update the user's profile with verification status
    const { error } = await supabase.rpc('update_oauth_verification', {
      p_wallet_address: state,
      p_platform: 'GitHub',
      p_is_verified: true,
      p_oauth_token: tokenData.access_token,
      p_username: username
    });

    if (error) {
      console.error('Database update failed:', error);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=database_update_failed`);
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?verified=GitHub&username=${username}`);

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=oauth_failed`);
  }
}
