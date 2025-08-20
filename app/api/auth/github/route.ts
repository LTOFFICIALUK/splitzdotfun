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
    const resolvedRedirectUri = 'https://splitz.fun/api/auth/github';

    console.log('GitHub OAuth callback received:', { 
      code: code ? code.substring(0, 10) + '...' : 'undefined',
      state,
      clientId: process.env.GITHUB_CLIENT_ID ? 'present' : 'missing',
      hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
      redirectUri: resolvedRedirectUri
    });

    // Exchange code for access token (use x-www-form-urlencoded per GitHub docs)
    const tokenParams = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      client_secret: process.env.GITHUB_CLIENT_SECRET || '',
      code: code!,
      redirect_uri: resolvedRedirectUri
    });

    console.log('GitHub token request (form-encoded):', tokenParams.toString());

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('GitHub token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(tokenResponse.headers.entries())
      });
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('GitHub OAuth: Token response data:', tokenData);

    if (tokenData.error) {
      console.error('GitHub OAuth error:', {
        error: tokenData.error,
        error_description: tokenData.error_description,
        error_uri: tokenData.error_uri
      });
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

    // First, get the existing profile to preserve other OAuth verifications
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('oauth_verifications')
      .eq('wallet_address', state)
      .single();

    // Merge existing OAuth verifications with the new GitHub verification
    const existingOAuthVerifications = existingProfile?.oauth_verifications || {};
    const updatedOAuthVerifications = {
      ...existingOAuthVerifications,
      GitHub: {
        is_verified: true,
        oauth_token: tokenData.access_token,
        username: username,
        verified_at: new Date().toISOString()
      }
    };

    // Update the user's profile with verification status
    const updateData = {
      wallet_address: state,
      oauth_verifications: updatedOAuthVerifications
    };

    console.log('GitHub OAuth: Attempting database update with data:', updateData);

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(updateData, {
        onConflict: 'wallet_address'
      });

    if (updateError) {
      console.error('GitHub OAuth: Database update failed:', updateError);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=database_update_failed`);
    }

    console.log('GitHub OAuth: Database update successful');

    // Also update social links if they don't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('social_links')
      .eq('wallet_address', state)
      .single();

    const existingSocialLinks = existingProfile?.social_links || [];
    const hasGitHubLink = existingSocialLinks.some((link: any) => link.platform === 'GitHub');

    if (!hasGitHubLink) {
      const newSocialLinks = [...existingSocialLinks, {
        platform: 'GitHub',
        handle: username,
        url: `https://github.com/${username}`
      }];

      const { error: socialError } = await supabase
        .from('profiles')
        .update({ social_links: newSocialLinks })
        .eq('wallet_address', state);

      if (socialError) {
        console.error('Social links update failed:', socialError);
      }
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?verified=GitHub&username=${username}`);

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=oauth_failed`);
  }
}
