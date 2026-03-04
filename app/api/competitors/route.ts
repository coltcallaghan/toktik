import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── Platform config ───────────────────────────────────────────── */

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'twitter', 'linkedin', 'facebook'] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_PROFILE_URL: Record<Platform, (username: string) => string> = {
  tiktok:    (u) => `https://www.tiktok.com/@${u}`,
  instagram: (u) => `https://www.instagram.com/${u}/`,
  youtube:   (u) => `https://www.youtube.com/@${u}`,
  twitter:   (u) => `https://twitter.com/${u}`,
  linkedin:  (u) => `https://www.linkedin.com/in/${u}/`,
  facebook:  (u) => `https://www.facebook.com/${u}`,
};

/** Detect platform from a pasted URL. Returns null if not recognised. */
function detectPlatformFromUrl(url: string): { platform: Platform; username: string } | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname.replace('www.', '');

    if (host === 'tiktok.com') {
      const match = u.pathname.match(/^\/@?([^/]+)/);
      if (match) return { platform: 'tiktok', username: match[1] };
    }
    if (host === 'instagram.com') {
      const match = u.pathname.match(/^\/([^/]+)/);
      if (match) return { platform: 'instagram', username: match[1] };
    }
    if (host === 'youtube.com') {
      const match = u.pathname.match(/^\/@?([^/]+)/);
      if (match) return { platform: 'youtube', username: match[1] };
    }
    if (host === 'twitter.com' || host === 'x.com') {
      const match = u.pathname.match(/^\/([^/]+)/);
      if (match) return { platform: 'twitter', username: match[1] };
    }
    if (host === 'linkedin.com') {
      const match = u.pathname.match(/^\/in\/([^/]+)/);
      if (match) return { platform: 'linkedin', username: match[1] };
    }
    if (host === 'facebook.com') {
      const match = u.pathname.match(/^\/([^/]+)/);
      if (match) return { platform: 'facebook', username: match[1] };
    }
  } catch {}
  return null;
}

/** Fetch the public profile page HTML and extract what we can. */
async function scrapeProfilePage(platform: Platform, username: string): Promise<{
  display_name: string | null;
  follower_count: number | null;
  bio: string | null;
  raw_html_excerpt: string;
}> {
  const profileUrl = PLATFORM_PROFILE_URL[platform](username);

  let html = '';
  try {
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      // 8 second timeout
      signal: AbortSignal.timeout(8000),
    });
    html = await res.text();
  } catch {
    return { display_name: null, follower_count: null, bio: null, raw_html_excerpt: '' };
  }

  // Extract a useful excerpt for Claude to analyse (strip most HTML tags, first 3000 chars)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 3000);

  let follower_count: number | null = null;
  let display_name: string | null = null;
  let bio: string | null = null;

  // Helper: parse "611K", "1.2M", "850,000" → integer
  function parseCount(s: string): number | null {
    const clean = s.replace(/,/g, '').trim();
    if (/^\d+$/.test(clean)) return parseInt(clean, 10);
    const m = clean.match(/^([\d.]+)\s*([KMBkmb])$/);
    if (m) {
      const n = parseFloat(m[1]);
      const mul = m[2].toUpperCase();
      if (mul === 'K') return Math.round(n * 1_000);
      if (mul === 'M') return Math.round(n * 1_000_000);
      if (mul === 'B') return Math.round(n * 1_000_000_000);
    }
    return null;
  }

  // TikTok: embedded JSON
  const tikTokMatch = html.match(/"followerCount"\s*:\s*(\d+)/i);
  // YouTube: og:description contains "611K subscribers" or JSON "subscriberCountText"
  const ytSubscriberText = html.match(/"subscriberCountText"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/i)
    || html.match(/"subscriberCountText"\s*:\s*"([^"]+)"/i)
    || html.match(/content="([\d.,KMB]+)\s+subscribers/i);
  // Instagram: JSON "edge_followed_by":{"count":N}
  const igMatch = html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i);
  // Generic fallback
  const genericMatch = html.match(/"followerCount"\s*:\s*(\d+)/i)
    || html.match(/"followersCount"\s*:\s*(\d+)/i);

  if (tikTokMatch) {
    follower_count = parseInt(tikTokMatch[1], 10);
  } else if (ytSubscriberText) {
    follower_count = parseCount(ytSubscriberText[1].replace(/\s*subscribers?/i, '').trim());
  } else if (igMatch) {
    follower_count = parseInt(igMatch[1], 10);
  } else if (genericMatch) {
    follower_count = parseInt(genericMatch[1], 10);
  }

  // Display name: og:title is most reliable across platforms
  const nameMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    || html.match(/"authorName"\s*:\s*"([^"]+)"/i)
    || html.match(/<title>([^<|–\-]+)/i);
  if (nameMatch) display_name = nameMatch[1].replace(/\s*[-–|].*$/, '').trim();

  // Bio: og:description
  const descMatch = html.match(/<meta\s+(?:name|property)="(?:og:description|description)"\s+content="([^"]+)"/i);
  if (descMatch) bio = descMatch[1].trim();

  return { display_name, follower_count, bio, raw_html_excerpt: textContent };
}

/* ── GET  /api/competitors — list all ──────────────────────────── */

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* ── POST /api/competitors — add + scrape + AI-analyze ─────────── */

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as {
      url?: string;
      platform?: string;
      username?: string;
      niche?: string;
      notes?: string;
    };

    // Resolve platform + username from either a pasted URL or explicit fields
    let platform: Platform;
    let username: string;

    if (body.url) {
      const detected = detectPlatformFromUrl(body.url);
      if (!detected) {
        return NextResponse.json(
          { error: 'Could not detect platform from URL. Paste a full profile link (e.g. https://www.tiktok.com/@username)' },
          { status: 400 }
        );
      }
      platform = detected.platform;
      username = detected.username;
    } else if (body.platform && body.username) {
      if (!PLATFORMS.includes(body.platform as Platform)) {
        return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
      }
      platform = body.platform as Platform;
      username = body.username.replace(/^@/, '').trim();
    } else {
      return NextResponse.json(
        { error: 'Provide either a profile URL or platform + username' },
        { status: 400 }
      );
    }

    // Scrape the public profile page for live data
    const scraped = await scrapeProfilePage(platform, username);

    // Use Claude only for content themes — things it can genuinely infer from bio/page text
    const client = getAnthropicClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a social media analyst. Based only on the profile info provided, identify the content themes this account posts about. If there is genuinely not enough information to determine themes, return an empty array. Never guess or make up themes. Output ONLY valid JSON, no markdown or code fences.`,
      messages: [
        {
          role: 'user',
          content: `Platform: ${platform}
Username: @${username}
Niche: ${body.niche || 'Unknown'}
Display name: ${scraped.display_name ?? username}
Bio: ${scraped.bio ?? 'not available'}
Page excerpt: ${scraped.raw_html_excerpt.slice(0, 800) || 'not available'}

Return JSON: {"top_content_themes": ["...", "...", "..."]} or {"top_content_themes": []} if insufficient data.`,
        },
      ],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    let analysis: Record<string, unknown> = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {}

    // Only use confirmed scraped data — never fabricate engagement metrics
    const follower_count = scraped.follower_count ?? 0;
    const display_name = scraped.display_name ?? username;

    const { data: saved, error: saveError } = await supabase
      .from('competitors')
      .insert({
        user_id: user.id,
        username,
        platform,
        display_name,
        niche: body.niche || null,
        follower_count,
        avg_views: null,
        avg_likes: null,
        avg_comments: null,
        posting_frequency: null,
        top_content_themes: (analysis.top_content_themes as string[]) ?? [],
        notes: body.notes || null,
        last_analyzed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
    return NextResponse.json(saved);
  } catch (err) {
    console.error('competitors POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* ── DELETE /api/competitors — remove by id ────────────────────── */

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* ── PATCH /api/competitors — refresh a competitor's data ──────── */

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Fetch existing record to get platform + username
    const { data: existing, error: fetchError } = await supabase
      .from('competitors')
      .select('platform, username, niche')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const platform = existing.platform as Platform;
    const username = existing.username as string;

    // Re-scrape
    const scraped = await scrapeProfilePage(platform, username);

    // Re-run Claude for themes
    const client = getAnthropicClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a social media analyst. Based only on the profile info provided, identify the content themes this account posts about. If there is genuinely not enough information to determine themes, return an empty array. Never guess or make up themes. Output ONLY valid JSON, no markdown or code fences.`,
      messages: [{
        role: 'user',
        content: `Platform: ${platform}\nUsername: @${username}\nNiche: ${existing.niche || 'Unknown'}\nDisplay name: ${scraped.display_name ?? username}\nBio: ${scraped.bio ?? 'not available'}\nPage excerpt: ${scraped.raw_html_excerpt.slice(0, 800) || 'not available'}\n\nReturn JSON: {"top_content_themes": ["...", "...", "..."]} or {"top_content_themes": []} if insufficient data.`,
      }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    let analysis: Record<string, unknown> = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {}

    const { data: updated, error: updateError } = await supabase
      .from('competitors')
      .update({
        display_name: scraped.display_name ?? username,
        follower_count: scraped.follower_count ?? 0,
        avg_views: null,
        avg_likes: null,
        avg_comments: null,
        posting_frequency: null,
        top_content_themes: (analysis.top_content_themes as string[]) ?? [],
        last_analyzed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('competitors PATCH error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
