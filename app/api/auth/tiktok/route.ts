import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/tiktok/callback`;

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));

    // CSRF state — store in cookie so callback can verify
    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_key: CLIENT_KEY,
      response_type: 'code',
      scope: 'user.info.basic,user.info.profile,user.info.stats',
      redirect_uri: REDIRECT_URI,
      state,
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

    const response = NextResponse.redirect(authUrl);
    // Store state for 10 minutes
    response.cookies.set('tiktok_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('tiktok oauth start error:', err);
    return NextResponse.redirect(new URL('/accounts?error=oauth_failed', req.url));
  }
}
