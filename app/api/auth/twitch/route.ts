import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This will contain the wallet address
  
  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=missing_params`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
        redirect_uri: 'https://splitz.fun/api/auth/twitch'
      })
    });

    if (!tokenResponse.ok) {
      console.error('Twitch token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!
      }
    });

    if (!userResponse.ok) {
      console.error('Twitch user info failed:', await userResponse.text());
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=user_info_failed`);
    }

    const userData = await userResponse.json();
    const username = userData.data[0]?.login;

    if (!username) {
      console.error('No username found in Twitch response');
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=user_info_failed`);
    }

    // First, get the existing profile to preserve other OAuth verifications
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('oauth_verifications')
      .eq('wallet_address', state)
      .single();

    // Merge existing OAuth verifications with the new Twitch verification
    const existingOAuthVerifications = existingProfile?.oauth_verifications || {};
    const updatedOAuthVerifications = {
      ...existingOAuthVerifications,
      Twitch: {
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

    const { error } = await supabase
      .from('profiles')
      .upsert(updateData, {
        onConflict: 'wallet_address'
      });

    if (error) {
      console.error('Database update failed:', error);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=database_update_failed`);
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?verified=Twitch&username=${username}`);

  } catch (error) {
    console.error('Twitch OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?error=oauth_failed`);
  }
}
