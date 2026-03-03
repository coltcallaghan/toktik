import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── GET  /api/competitors — list all ──────────────────────────── */

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* ── POST /api/competitors — add + AI-analyze ─────────────────── */

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, niche, notes } = await req.json();
    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 });
    }

    const cleanUsername = username.replace(/^@/, '').trim();

    // AI analysis of the competitor
    const client = getAnthropicClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You are a TikTok competitive intelligence analyst. Given a competitor username and optional niche, provide a realistic competitive analysis.

Rules:
- Estimate follower_count, avg_views, avg_likes, avg_comments as realistic numbers
- Suggest posting_frequency (e.g. "3x daily", "5x weekly")
- Identify 3-5 top_content_themes they likely focus on
- Provide a display_name
- Output ONLY valid JSON — no markdown, no code fences`,
      messages: [
        {
          role: 'user',
          content: `Analyze TikTok competitor: @${cleanUsername}
Niche: ${niche || 'Unknown'}
${notes ? `Additional context: ${notes}` : ''}

Return JSON: {"display_name": "...", "follower_count": N, "avg_views": N, "avg_likes": N, "avg_comments": N, "posting_frequency": "...", "top_content_themes": ["...", "..."]}`,
        },
      ],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    let analysis;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {};
    }

    const { data: saved, error: saveError } = await supabase
      .from('competitors')
      .insert({
        user_id: user.id,
        username: cleanUsername,
        display_name: analysis.display_name ?? cleanUsername,
        niche: niche || null,
        follower_count: analysis.follower_count ?? 0,
        avg_views: analysis.avg_views ?? 0,
        avg_likes: analysis.avg_likes ?? 0,
        avg_comments: analysis.avg_comments ?? 0,
        posting_frequency: analysis.posting_frequency ?? null,
        top_content_themes: analysis.top_content_themes ?? [],
        notes: notes || null,
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

/* ── DELETE /api/competitors — remove by id (query param) ──────── */

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
