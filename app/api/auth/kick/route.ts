import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  console.log('Kick OAuth callback received request:', request.url);
  
  // Log request headers to see if there are any clues
  const headers = Object.fromEntries(request.headers.entries());
  console.log('Kick OAuth request headers:', headers);
  
  const { searchParams } = new URL(request.url);
  
  // Log ALL search parameters to see what Kick is actually sending
  const allParams = Object.fromEntries(searchParams.entries());
  console.log('Kick OAuth ALL callback parameters:', allParams);
  
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This will contain the wallet address and code_verifier
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  console.log('Kick OAuth callback parameters:', { 
    code: code ? 'present' : 'missing', 
    state: state ? 'present' : 'missing',
    error: error || 'none',
    errorDescription: errorDescription || 'none'
  });
  
  // Check for OAuth errors first
  if (error) {
    console.error('Kick OAuth error from authorization server:', { error, errorDescription });
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=oauth_error&error_description=${encodeURIComponent(errorDescription || '')}`);
  }
  
  if (!code || !state) {
    console.error('Kick OAuth missing parameters:', { code: !!code, state: !!state });
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=missing_params`);
  }

  // Extract wallet address and code_verifier from state
  let walletAddress: string;
  let codeVerifier: string;
  
  try {
    const stateData = JSON.parse(atob(state.replace(/-/g, '+').replace(/_/g, '/')));
    walletAddress = stateData.wallet;
    codeVerifier = stateData.code_verifier;
  } catch (error) {
    console.error('Failed to parse state parameter:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=invalid_state`);
  }

  try {
    console.log('Kick OAuth callback received:', { 
      code: code ? code.substring(0, 10) + '...' : 'undefined',
      walletAddress,
      codeVerifier: codeVerifier ? codeVerifier.substring(0, 10) + '...' : 'undefined',
      clientId: process.env.KICK_CLIENT_ID ? 'present' : 'missing',
      hasClientSecret: !!process.env.KICK_CLIENT_SECRET,
      redirectUri: 'https://splitz.fun/api/auth/kick'
    });

    // Exchange code for access token with PKCE
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KICK_CLIENT_ID || '',
      client_secret: process.env.KICK_CLIENT_SECRET || '',
      code: code,
      redirect_uri: 'https://splitz.fun/api/auth/kick',
      code_verifier: codeVerifier
    });

    console.log('Kick token request (form-encoded):', tokenParams.toString());

    const tokenResponse = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Kick token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(tokenResponse.headers.entries())
      });
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Kick OAuth: Token response data:', tokenData);
    console.log('Kick OAuth: Token exchange successful, proceeding to user info');

    if (tokenData.error) {
      console.error('Kick OAuth error:', {
        error: tokenData.error,
        error_description: tokenData.error_description
      });
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=token_exchange_failed`);
    }

    // Get user info
    const userResponse = await fetch('https://api.kick.com/public/v1/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      console.error('Kick user info failed:', await userResponse.text());
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=user_info_failed`);
    }

    const userData = await userResponse.json();
    const username = userData.username || userData.name;

    if (!username) {
      console.error('No username found in Kick response');
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=user_info_failed`);
    }

    // First, get the existing profile to preserve other OAuth verifications
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('oauth_verifications')
      .eq('wallet_address', walletAddress)
      .single();

    // Merge existing OAuth verifications with the new Kick verification
    const existingOAuthVerifications = existingProfile?.oauth_verifications || {};
    const updatedOAuthVerifications = {
      ...existingOAuthVerifications,
      Kick: {
        is_verified: true,
        oauth_token: tokenData.access_token,
        username: username,
        verified_at: new Date().toISOString()
      }
    };

    // Update the user's profile with verification status
    const updateData = {
      wallet_address: walletAddress,
      oauth_verifications: updatedOAuthVerifications
    };

    console.log('Kick OAuth: Attempting database update with data:', updateData);

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(updateData, {
        onConflict: 'wallet_address'
      });

    if (updateError) {
      console.error('Kick OAuth: Database update failed:', updateError);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=database_update_failed`);
    }

    console.log('Kick OAuth: Database update successful');

    // Also update social links if they don't exist
    const { data: profileForSocialLinks } = await supabase
      .from('profiles')
      .select('social_links')
      .eq('wallet_address', walletAddress)
      .single();

    const existingSocialLinks = profileForSocialLinks?.social_links || [];
    const hasKickLink = existingSocialLinks.some((link: any) => link.platform === 'Kick');

    if (!hasKickLink) {
      const newSocialLinks = [...existingSocialLinks, {
        platform: 'Kick',
        handle: username,
        url: `https://kick.com/${username}`
      }];

      const { error: socialError } = await supabase
        .from('profiles')
        .update({ social_links: newSocialLinks })
        .eq('wallet_address', walletAddress);

      if (socialError) {
        console.error('Social links update failed:', socialError);
      }
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?verified=Kick&username=${username}`);

  } catch (error) {
    console.error('Kick OAuth error:', error);
    console.error('Kick OAuth error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=oauth_failed`);
  }
}
