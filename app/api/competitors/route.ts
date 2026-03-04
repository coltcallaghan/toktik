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

  // Try to pull follower count from common meta/json patterns
  let follower_count: number | null = null;
  let display_name: string | null = null;
  let bio: string | null = null;

  // TikTok: JSON-LD or meta tags
  const followerMatch = html.match(/"followerCount"\s*:\s*(\d+)/i)
    || html.match(/followers["\s:>]*([0-9,.KMB]+)/i);
  if (followerMatch) {
    const raw = followerMatch[1].replace(/,/g, '');
    if (/^\d+$/.test(raw)) follower_count = parseInt(raw, 10);
  }

  const nameMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    || html.match(/"authorName"\s*:\s*"([^"]+)"/i)
    || html.match(/<title>([^<|–-]+)/i);
  if (nameMatch) display_name = nameMatch[1].trim();

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

    // AI analysis — combine scraped context with Claude intelligence
    const client = getAnthropicClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: `You are a social media competitive intelligence analyst. Analyze a competitor's public profile and provide structured data.

Rules:
- Use any scraped data provided; estimate realistically where data is missing
- follower_count, avg_views, avg_likes, avg_comments must be integers
- posting_frequency: e.g. "2x daily", "5x weekly", "daily"
- top_content_themes: 3-5 short phrases describing their content
- Output ONLY valid JSON, no markdown or code fences`,
      messages: [
        {
          role: 'user',
          content: `Platform: ${platform}
Username: @${username}
Niche: ${body.niche || 'Unknown'}
${body.notes ? `Notes: ${body.notes}` : ''}

Scraped profile data:
- Display name: ${scraped.display_name ?? 'not found'}
- Follower count: ${scraped.follower_count ?? 'not found'}
- Bio: ${scraped.bio ?? 'not found'}
- Page excerpt: ${scraped.raw_html_excerpt.slice(0, 1000) || 'not available'}

Return JSON: {"display_name": "...", "follower_count": N, "avg_views": N, "avg_likes": N, "avg_comments": N, "posting_frequency": "...", "top_content_themes": ["...", "..."]}`,
        },
      ],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    let analysis: Record<string, unknown> = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {}

    // Prefer live scraped data over AI estimates
    const follower_count = scraped.follower_count ?? (analysis.follower_count as number) ?? 0;
    const display_name = scraped.display_name ?? (analysis.display_name as string) ?? username;

    const { data: saved, error: saveError } = await supabase
      .from('competitors')
      .insert({
        user_id: user.id,
        username,
        platform,
        display_name,
        niche: body.niche || null,
        follower_count,
        avg_views: (analysis.avg_views as number) ?? 0,
        avg_likes: (analysis.avg_likes as number) ?? 0,
        avg_comments: (analysis.avg_comments as number) ?? 0,
        posting_frequency: (analysis.posting_frequency as string) ?? null,
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
