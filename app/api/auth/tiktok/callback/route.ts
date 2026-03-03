import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/tiktok/callback`;

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  open_id: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface TikTokUserResponse {
  data: {
    user: {
      open_id: string;
      union_id: string;
      display_name: string;
      avatar_url: string;
      follower_count: number;
      following_count: number;
      likes_count: number;
      bio_description: string;
      profile_deep_link: string;
      is_verified: boolean;
    };
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const redirectToAccounts = (err: string) =>
    NextResponse.redirect(new URL(`/accounts?error=${encodeURIComponent(err)}`, req.url));

  try {
    // Handle TikTok-side errors
    if (error) {
      return redirectToAccounts(error);
    }

    if (!code || !state) {
      return redirectToAccounts('missing_code');
    }

    // Verify CSRF state
    const cookieStore = await cookies();
    const savedState = cookieStore.get('tiktok_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      return redirectToAccounts('invalid_state');
    }

    // Auth check
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));

    // ── Step 1: Exchange code for tokens ────────────────────────────────────
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens: TikTokTokenResponse = await tokenRes.json();

    if (tokens.error || !tokens.access_token) {
      console.error('tiktok token exchange error:', tokens.error_description);
      return redirectToAccounts(tokens.error_description ?? 'token_exchange_failed');
    }

    // ── Step 2: Fetch user profile ───────────────────────────────────────────
    const profileRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,bio_description,is_verified',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const profileData: TikTokUserResponse = await profileRes.json();

    if (profileData.error?.code !== 'ok' || !profileData.data?.user) {
      console.error('tiktok profile fetch error:', profileData.error);
      return redirectToAccounts('profile_fetch_failed');
    }

    const tk = profileData.data.user;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const username = tk.display_name
      ? `@${tk.display_name.toLowerCase().replace(/\s+/g, '_')}`
      : `@tiktok_${tk.open_id.slice(0, 8)}`;

    // ── Step 3: Upsert account in Supabase ───────────────────────────────────
    // Check if this TikTok account is already connected
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('tiktok_open_id', tk.open_id)
      .single();

    if (existing) {
      // Update tokens + refresh profile
      await supabase
        .from('accounts')
        .update({
          tiktok_access_token: tokens.access_token,
          tiktok_refresh_token: tokens.refresh_token,
          tiktok_token_expires_at: tokenExpiresAt,
          followers_count: tk.follower_count ?? 0,
          avatar_url: tk.avatar_url ?? null,
          display_name: tk.display_name ?? null,
          status: 'active',
        })
        .eq('id', existing.id);
    } else {
      // Insert new connected account
      await supabase.from('accounts').insert({
        user_id: user.id,
        platform_username: username,
        platform_id: tk.open_id,
        tiktok_open_id: tk.open_id,
        tiktok_access_token: tokens.access_token,
        tiktok_refresh_token: tokens.refresh_token,
        tiktok_token_expires_at: tokenExpiresAt,
        followers_count: tk.follower_count ?? 0,
        avatar_url: tk.avatar_url ?? null,
        display_name: tk.display_name ?? null,
        status: 'active',
        team_id: null,
        niche: null,
      });
    }

    // Clear CSRF cookie
    const response = NextResponse.redirect(new URL('/accounts?connected=true', req.url));
    response.cookies.delete('tiktok_oauth_state');
    return response;

  } catch (err) {
    console.error('tiktok callback unhandled error:', err);
    return redirectToAccounts('unknown_error');
  }
}
