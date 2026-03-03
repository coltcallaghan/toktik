import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import type { PlatformKey } from './platform-helpers';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PlatformProfile {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number;
  pageId?: string;
  pageAccessToken?: string;
}

export interface PlatformPublishParams {
  accessToken: string;
  videoUrl: string;
  title: string;
  caption: string;
  platformUserId?: string;
  pageId?: string;
  pageAccessToken?: string;
}

export interface PlatformPublishResult {
  success: boolean;
  publishId?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  OAuth Configs                                                      */
/* ------------------------------------------------------------------ */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  redirectPath: string;
  usesPKCE?: boolean;
  tokenAuthMethod?: 'body' | 'basic';
  extraAuthParams?: Record<string, string>;
}

const OAUTH_CONFIGS: Record<Exclude<PlatformKey, 'tiktok'>, OAuthConfig> = {
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    redirectPath: '/api/auth/youtube/callback',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },
  instagram: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    redirectPath: '/api/auth/instagram/callback',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scope: 'pages_manage_posts,pages_read_engagement,publish_video,pages_show_list',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    redirectPath: '/api/auth/facebook/callback',
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scope: 'tweet.read tweet.write users.read offline.access',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    redirectPath: '/api/auth/twitter/callback',
    usesPKCE: true,
    tokenAuthMethod: 'basic',
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: 'openid profile w_member_social',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    redirectPath: '/api/auth/linkedin/callback',
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getConfig(platform: Exclude<PlatformKey, 'tiktok'>) {
  const cfg = OAUTH_CONFIGS[platform];
  return {
    ...cfg,
    clientId: process.env[cfg.clientIdEnv] ?? '',
    clientSecret: process.env[cfg.clientSecretEnv] ?? '',
    redirectUri: `${APP_URL}${cfg.redirectPath}`,
  };
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

/* ------------------------------------------------------------------ */
/*  OAuth: Initiation (shared)                                         */
/* ------------------------------------------------------------------ */

export async function initiateOAuth(req: NextRequest, platform: Exclude<PlatformKey, 'tiktok'>) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));

    const cfg = getConfig(platform);
    if (!cfg.clientId) {
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(`${platform}_not_configured`)}`, req.url)
      );
    }

    const state = crypto.randomBytes(16).toString('hex');
    const params: Record<string, string> = {
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      scope: cfg.scope,
      state,
      ...(cfg.extraAuthParams ?? {}),
    };

    const responseCookies: Record<string, string> = {
      [`${platform}_oauth_state`]: state,
    };

    // PKCE support (Twitter)
    if (cfg.usesPKCE) {
      const verifier = crypto.randomBytes(32).toString('base64url');
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
      params.code_challenge = challenge;
      params.code_challenge_method = 'S256';
      responseCookies[`${platform}_code_verifier`] = verifier;
    }

    const authUrl = `${cfg.authUrl}?${new URLSearchParams(params).toString()}`;
    const response = NextResponse.redirect(authUrl);

    for (const [name, value] of Object.entries(responseCookies)) {
      response.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error(`${platform} oauth start error:`, err);
    return NextResponse.redirect(new URL('/accounts?error=oauth_failed', req.url));
  }
}

/* ------------------------------------------------------------------ */
/*  OAuth: Callback (shared)                                           */
/* ------------------------------------------------------------------ */

export async function handleOAuthCallback(req: NextRequest, platform: Exclude<PlatformKey, 'tiktok'>) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const redirectErr = (msg: string) =>
    NextResponse.redirect(new URL(`/accounts?error=${encodeURIComponent(msg)}`, req.url));

  try {
    if (error) return redirectErr(error);
    if (!code || !state) return redirectErr('missing_code');

    const cookieStore = await cookies();
    const savedState = cookieStore.get(`${platform}_oauth_state`)?.value;
    if (!savedState || savedState !== state) return redirectErr('invalid_state');

    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));

    const cfg = getConfig(platform);

    // ── Exchange code for tokens ────────────────────────────────
    const tokenParams: Record<string, string> = {
      code,
      grant_type: 'authorization_code',
      redirect_uri: cfg.redirectUri,
    };

    if (cfg.tokenAuthMethod !== 'basic') {
      tokenParams.client_id = cfg.clientId;
      tokenParams.client_secret = cfg.clientSecret;
    }

    // PKCE
    if (cfg.usesPKCE) {
      const verifier = cookieStore.get(`${platform}_code_verifier`)?.value;
      if (verifier) tokenParams.code_verifier = verifier;
    }

    const tokenHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (cfg.tokenAuthMethod === 'basic') {
      tokenHeaders['Authorization'] =
        `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`;
    }

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: tokenHeaders,
      body: new URLSearchParams(tokenParams),
    });
    const tokens = await tokenRes.json();

    if (tokens.error || !tokens.access_token) {
      return redirectErr(tokens.error_description ?? tokens.error ?? 'token_exchange_failed');
    }

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token ?? null;
    const expiresIn = tokens.expires_in ? Number(tokens.expires_in) : 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // ── Fetch profile ───────────────────────────────────────────
    const profile = await fetchPlatformProfile(platform, accessToken);
    if (!profile) return redirectErr('profile_fetch_failed');

    // ── Upsert account ──────────────────────────────────────────
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('platform_user_id', profile.userId)
      .single();

    const metadata: Record<string, unknown> = {};
    if (profile.pageAccessToken) metadata.page_access_token = profile.pageAccessToken;

    if (existing) {
      await supabase.from('accounts').update({
        platform_access_token: accessToken,
        platform_refresh_token: refreshToken,
        platform_token_expires_at: tokenExpiresAt,
        platform_user_id: profile.userId,
        platform_page_id: profile.pageId ?? null,
        platform_metadata: metadata,
        followers_count: profile.followerCount,
        avatar_url: profile.avatarUrl,
        display_name: profile.displayName,
        platform_username: profile.username,
        status: 'active',
      }).eq('id', existing.id);
    } else {
      await supabase.from('accounts').insert({
        user_id: user.id,
        platform,
        platform_username: profile.username,
        platform_id: profile.userId,
        platform_access_token: accessToken,
        platform_refresh_token: refreshToken,
        platform_token_expires_at: tokenExpiresAt,
        platform_user_id: profile.userId,
        platform_page_id: profile.pageId ?? null,
        platform_metadata: metadata,
        followers_count: profile.followerCount,
        avatar_url: profile.avatarUrl,
        display_name: profile.displayName,
        status: 'active',
        team_id: null,
        niche: null,
      });
    }

    const response = NextResponse.redirect(
      new URL(`/accounts?connected=true&platform=${platform}`, req.url)
    );
    response.cookies.delete(`${platform}_oauth_state`);
    if (cfg.usesPKCE) response.cookies.delete(`${platform}_code_verifier`);
    return response;
  } catch (err) {
    console.error(`${platform} callback error:`, err);
    return redirectErr('unknown_error');
  }
}

/* ------------------------------------------------------------------ */
/*  Platform-specific profile fetchers                                 */
/* ------------------------------------------------------------------ */

async function fetchPlatformProfile(
  platform: Exclude<PlatformKey, 'tiktok'>,
  accessToken: string
): Promise<PlatformProfile | null> {
  try {
    switch (platform) {
      case 'youtube':   return fetchYouTubeProfile(accessToken);
      case 'instagram': return fetchInstagramProfile(accessToken);
      case 'facebook':  return fetchFacebookProfile(accessToken);
      case 'twitter':   return fetchTwitterProfile(accessToken);
      case 'linkedin':  return fetchLinkedInProfile(accessToken);
      default: return null;
    }
  } catch (err) {
    console.error(`${platform} profile fetch error:`, err);
    return null;
  }
}

async function fetchYouTubeProfile(token: string): Promise<PlatformProfile | null> {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const ch = data.items?.[0];
  if (!ch) return null;
  return {
    userId: ch.id,
    username: `@${ch.snippet.customUrl?.replace('@', '') ?? ch.snippet.title.toLowerCase().replace(/\s+/g, '')}`,
    displayName: ch.snippet.title,
    avatarUrl: ch.snippet.thumbnails?.default?.url ?? null,
    followerCount: Number(ch.statistics.subscriberCount) || 0,
  };
}

async function fetchInstagramProfile(token: string): Promise<PlatformProfile | null> {
  // Instagram Business accounts are linked through Facebook Pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`
  );
  const pagesData = await pagesRes.json();
  const page = pagesData.data?.find((p: { instagram_business_account?: unknown }) => p.instagram_business_account);

  if (!page?.instagram_business_account) {
    // Fallback: direct Instagram Graph API (for basic display API tokens)
    const meRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,followers_count&access_token=${token}`
    );
    const me = await meRes.json();
    if (!me.id) return null;
    return {
      userId: me.id,
      username: me.username ? `@${me.username}` : `@ig_${me.id.slice(0, 8)}`,
      displayName: me.name ?? null,
      avatarUrl: me.profile_picture_url ?? null,
      followerCount: me.followers_count ?? 0,
    };
  }

  const igId = page.instagram_business_account.id;
  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${igId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${token}`
  );
  const ig = await igRes.json();

  return {
    userId: igId,
    username: ig.username ? `@${ig.username}` : `@ig_${igId.slice(0, 8)}`,
    displayName: ig.name ?? null,
    avatarUrl: ig.profile_picture_url ?? null,
    followerCount: ig.followers_count ?? 0,
    pageId: page.id,
    pageAccessToken: page.access_token,
  };
}

async function fetchFacebookProfile(token: string): Promise<PlatformProfile | null> {
  // We publish to Pages, so fetch the user's first page
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture,access_token,followers_count&access_token=${token}`
  );
  const pagesData = await pagesRes.json();
  const page = pagesData.data?.[0];

  if (page) {
    return {
      userId: page.id,
      username: `@${page.name.toLowerCase().replace(/\s+/g, '')}`,
      displayName: page.name,
      avatarUrl: page.picture?.data?.url ?? null,
      followerCount: page.followers_count ?? 0,
      pageId: page.id,
      pageAccessToken: page.access_token,
    };
  }

  // Fallback to personal profile
  const meRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name,picture&access_token=${token}`
  );
  const me = await meRes.json();
  if (!me.id) return null;
  return {
    userId: me.id,
    username: `@${me.name?.toLowerCase().replace(/\s+/g, '') ?? 'fb_user'}`,
    displayName: me.name ?? null,
    avatarUrl: me.picture?.data?.url ?? null,
    followerCount: 0,
  };
}

async function fetchTwitterProfile(token: string): Promise<PlatformProfile | null> {
  const res = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,name,username',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const u = data.data;
  if (!u) return null;
  return {
    userId: u.id,
    username: `@${u.username}`,
    displayName: u.name ?? null,
    avatarUrl: u.profile_image_url ?? null,
    followerCount: u.public_metrics?.followers_count ?? 0,
  };
}

async function fetchLinkedInProfile(token: string): Promise<PlatformProfile | null> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.sub) return null;
  return {
    userId: data.sub,
    username: `@${data.name?.toLowerCase().replace(/\s+/g, '_') ?? `li_${data.sub.slice(0, 8)}`}`,
    displayName: data.name ?? null,
    avatarUrl: data.picture ?? null,
    followerCount: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Sync helper                                                        */
/* ------------------------------------------------------------------ */

export async function syncPlatformProfile(
  platform: PlatformKey,
  accessToken: string
): Promise<Partial<{ followers_count: number; avatar_url: string | null; display_name: string | null }> | null> {
  if (platform === 'tiktok') return null; // handled by existing /api/auth/tiktok/sync
  const profile = await fetchPlatformProfile(platform as Exclude<PlatformKey, 'tiktok'>, accessToken);
  if (!profile) return null;
  return {
    followers_count: profile.followerCount,
    avatar_url: profile.avatarUrl,
    display_name: profile.displayName,
  };
}

/* ------------------------------------------------------------------ */
/*  Publish dispatcher                                                 */
/* ------------------------------------------------------------------ */

export async function publishToPlatform(
  platform: PlatformKey,
  params: PlatformPublishParams
): Promise<PlatformPublishResult> {
  switch (platform) {
    case 'tiktok':    return publishToTikTok(params);
    case 'youtube':   return publishToYouTube(params);
    case 'instagram': return publishToInstagram(params);
    case 'facebook':  return publishToFacebook(params);
    case 'twitter':   return publishToTwitter(params);
    case 'linkedin':  return publishToLinkedIn(params);
    default: return { success: false, error: `Unsupported platform: ${platform}` };
  }
}

/* ── TikTok ─────────────────────────────────────────────────────── */

async function publishToTikTok(p: PlatformPublishParams): Promise<PlatformPublishResult> {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${p.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: p.caption.slice(0, 2200),
        privacy_level: 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: 'PULL_FROM_URL', video_url: p.videoUrl },
    }),
  });
  const data = await res.json();
  if (data.error?.code !== 'ok') return { success: false, error: data.error?.message };
  return { success: true, publishId: data.data?.publish_id };
}

/* ── YouTube ────────────────────────────────────────────────────── */

async function publishToYouTube(p: PlatformPublishParams): Promise<PlatformPublishResult> {
  try {
    // Download the video
    const videoRes = await fetch(p.videoUrl);
    if (!videoRes.ok) return { success: false, error: 'Failed to download video' };
    const videoBuffer = await videoRes.arrayBuffer();

    // Initialize resumable upload
    const metadata = {
      snippet: {
        title: p.title.slice(0, 100),
        description: p.caption.slice(0, 5000),
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: 'private',
        selfDeclaredMadeForKids: false,
      },
    };

    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${p.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(videoBuffer.byteLength),
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      return { success: false, error: (err as { error?: { message?: string } }).error?.message ?? `YouTube init failed: ${initRes.status}` };
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) return { success: false, error: 'No upload URL returned' };

    // Upload video bytes
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: videoBuffer,
    });

    if (!uploadRes.ok) return { success: false, error: `YouTube upload failed: ${uploadRes.status}` };
    const uploadData = await uploadRes.json();
    return { success: true, publishId: uploadData.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'YouTube publish error' };
  }
}

/* ── Instagram ──────────────────────────────────────────────────── */

async function publishToInstagram(p: PlatformPublishParams): Promise<PlatformPublishResult> {
  const pageToken = p.pageAccessToken;
  const igUserId = p.platformUserId;
  if (!pageToken || !igUserId) {
    return { success: false, error: 'Missing Instagram page token or user ID — reconnect account' };
  }

  try {
    // Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: p.videoUrl,
        caption: p.caption.slice(0, 2200),
        media_type: 'REELS',
        access_token: pageToken,
      }),
    });
    const container = await containerRes.json();
    if (container.error) return { success: false, error: container.error.message };
    const containerId = container.id;

    // Poll until processing finishes
    let status = 'IN_PROGRESS';
    let attempts = 0;
    while (status === 'IN_PROGRESS' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${pageToken}`
      );
      const statusData = await statusRes.json();
      status = statusData.status_code ?? 'ERROR';
      attempts++;
    }

    if (status !== 'FINISHED') return { success: false, error: `Processing failed: ${status}` };

    // Publish
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: pageToken }),
    });
    const pub = await publishRes.json();
    if (pub.error) return { success: false, error: pub.error.message };
    return { success: true, publishId: pub.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Instagram publish error' };
  }
}

/* ── Facebook ───────────────────────────────────────────────────── */

async function publishToFacebook(p: PlatformPublishParams): Promise<PlatformPublishResult> {
  const pageToken = p.pageAccessToken;
  const pageId = p.pageId;
  if (!pageToken || !pageId) {
    return { success: false, error: 'Missing Facebook page token or page ID — reconnect account' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: p.videoUrl,
        description: p.caption.slice(0, 8000),
        title: p.title.slice(0, 255),
        access_token: pageToken,
      }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, publishId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Facebook publish error' };
  }
}

/* ── Twitter / X ────────────────────────────────────────────────── */

async function publishToTwitter(p: PlatformPublishParams): Promise<PlatformPublishResult> {
  try {
    // Download video
    const videoRes = await fetch(p.videoUrl);
    if (!videoRes.ok) return { success: false, error: 'Failed to download video' };
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    // Init chunked media upload
    const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: String(videoBuffer.byteLength),
        media_type: 'video/mp4',
        media_category: 'tweet_video',
      }),
    });
    const initData = await initRes.json();
    if (!initData.media_id_string) return { success: false, error: 'Twitter media init failed' };
    const mediaId = initData.media_id_string;

    // Upload chunks (5 MB each)
    const CHUNK_SIZE = 5 * 1024 * 1024;
    for (let i = 0; i * CHUNK_SIZE < videoBuffer.byteLength; i++) {
      const chunk = videoBuffer.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const form = new FormData();
      form.append('command', 'APPEND');
      form.append('media_id', mediaId);
      form.append('segment_index', String(i));
      form.append('media_data', chunk.toString('base64'));

      await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: { Authorization: `Bearer ${p.accessToken}` },
        body: form,
      });
    }

    // Finalize
    await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }),
    });

    // Wait for processing
    let processing = true;
    let attempts = 0;
    while (processing && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
        { headers: { Authorization: `Bearer ${p.accessToken}` } }
      );
      const statusData = await statusRes.json();
      if (!statusData.processing_info) processing = false;
      else if (statusData.processing_info.state === 'failed') {
        return { success: false, error: 'Video processing failed' };
      }
      attempts++;
    }

    // Create tweet
    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: p.caption.slice(0, 280),
        media: { media_ids: [mediaId] },
      }),
    });
    const tweet = await tweetRes.json();
    if (tweet.errors) return { success: false, error: tweet.errors[0]?.message ?? 'Tweet failed' };
    return { success: true, publishId: tweet.data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Twitter publish error' };
  }
}

/* ── LinkedIn ───────────────────────────────────────────────────── */

async function publishToLinkedIn(p: PlatformPublishParams): Promise<PlatformPublishResult> {
  const authorId = p.platformUserId;
  if (!authorId) return { success: false, error: 'Missing LinkedIn user ID — reconnect account' };

  try {
    // Attempt to register video upload
    const registerRes = await fetch('https://api.linkedin.com/v2/videos?action=initializeUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${authorId}`,
          fileSizeBytes: 0,
        },
      }),
    });

    if (!registerRes.ok) {
      // Fallback: text post with link
      const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${p.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${authorId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: `${p.title}\n\n${p.caption}`.slice(0, 3000) },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
      });
      const post = await postRes.json();
      if (post.id) return { success: true, publishId: post.id };
      return { success: false, error: 'LinkedIn post failed' };
    }

    const registerData = await registerRes.json();
    const uploadUrl = registerData.value?.uploadUrl;
    const videoAsset = registerData.value?.video;
    if (!uploadUrl) return { success: false, error: 'No LinkedIn upload URL' };

    // Upload video
    const videoRes = await fetch(p.videoUrl);
    const videoBuffer = await videoRes.arrayBuffer();

    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${p.accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: videoBuffer,
    });

    // Create post with video
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${authorId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: p.caption.slice(0, 3000) },
            shareMediaCategory: 'VIDEO',
            media: [{
              status: 'READY',
              media: videoAsset,
              title: { text: p.title },
            }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    const post = await postRes.json();
    if (post.id) return { success: true, publishId: post.id };
    return { success: false, error: post.message ?? 'LinkedIn video post failed' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'LinkedIn publish error' };
  }
}

/* ------------------------------------------------------------------ */
/*  Token helpers (re-exported from client-safe module)                 */
/* ------------------------------------------------------------------ */

export { getAccessToken, isOAuthConnected, isTokenExpiredCheck } from './platform-helpers';
export type { PlatformKey } from './platform-helpers';
