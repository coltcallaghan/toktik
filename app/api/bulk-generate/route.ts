import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Account } from '@/lib/supabase';

/* ── Helpers (shared with generate-content) ─────────────────────── */

async function runAgent(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

function buildThemeContext(account: Account): string {
  const lines: string[] = [];
  if (account.niche) lines.push(`Niche: ${account.niche}`);
  if (account.tone) lines.push(`Tone: ${account.tone}`);
  if (account.content_style) lines.push(`Content style: ${account.content_style}`);
  if (account.target_audience) lines.push(`Target audience: ${account.target_audience}`);
  if (account.posting_goals) lines.push(`Posting goals: ${account.posting_goals}`);
  if (account.brand_voice) lines.push(`Brand voice notes: ${account.brand_voice}`);
  return lines.length > 0 ? `\n\nACCOUNT THEME:\n${lines.join('\n')}` : '';
}

/* ── Generate one content piece for a single account ────────────── */

async function generateForAccount(
  client: Anthropic,
  supabase: ReturnType<typeof createServerClient>,
  account: Account,
  trendName: string,
  trendDescription: string
): Promise<{ account_id: string; content_id: string; title: string; status: 'ok' | 'error'; error?: string }> {
  try {
    const nicheContext = account.niche ?? 'General TikTok';
    const themeContext = buildThemeContext(account);
    const username = account.platform_username;

    // Agent 1: Title & Hook
    const titleRaw = await runAgent(
      client,
      `You are a viral TikTok title and hook strategist.
Rules:
- Title: max 60 chars, curiosity-driven, no clickbait
- Hook: first spoken line, max 15 words, creates immediate tension
- Match the account's tone and audience exactly
- Output ONLY valid JSON`,
      `Trend: ${trendName}
Context: ${trendDescription}
Niche: ${nicheContext}
Account: ${username}${themeContext}

Respond with ONLY: {"title": "...", "hook": "..."}`
    );
    const { title = 'Trending Content', hook = '' } = parseJSON<{ title: string; hook: string }>(
      titleRaw,
      { title: 'Trending Content', hook: '' }
    );

    // Agent 2: Script
    const script = await runAgent(
      client,
      `You are an expert TikTok script writer.
Rules:
- 60 seconds max when read aloud (~130 words)
- Start directly with the hook
- Short sentences. Urgency. Build to a payoff.
- End with a specific CTA
- Write ONLY the script text`,
      `Trend: ${trendName}
Opening hook: ${hook}
Niche: ${nicheContext}
Title: ${title}${themeContext}

Write the complete script now:`
    );

    // Agent 3: Caption & Hashtags
    const captionRaw = await runAgent(
      client,
      `You are a TikTok SEO and caption specialist.
Rules:
- Caption: 1-2 punchy sentences, includes a CTA
- Hashtags: exactly 8
- Output ONLY valid JSON`,
      `Title: ${title}
Trend: ${trendName}
Niche: ${nicheContext}${themeContext}

Respond with ONLY: {"caption": "...", "hashtags": ["#tag1", "#tag2", ...]}`
    );
    const { caption = '', hashtags = [] } = parseJSON<{ caption: string; hashtags: string[] }>(
      captionRaw,
      { caption: '', hashtags: [] }
    );

    // Save draft
    const fullScript = hook ? `HOOK: ${hook}\n\n${script}` : script;
    const fullCaption = `${caption}\n\n${hashtags.slice(0, 8).join(' ')}`.trim();

    const { data: saved, error: saveError } = await supabase
      .from('content')
      .insert({
        account_id: account.id,
        team_id: null,
        title,
        script: fullScript,
        video_url: null,
        status: 'draft' as const,
        scheduled_at: null,
        published_at: null,
        engagement_metrics: { caption: fullCaption },
      })
      .select('id')
      .single();

    if (saveError) throw new Error(saveError.message);

    return { account_id: account.id, content_id: saved.id, title, status: 'ok' };
  } catch (err) {
    return {
      account_id: account.id,
      content_id: '',
      title: '',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/* ── POST /api/bulk-generate ────────────────────────────────────── */

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

    const { trend_name, trend_description, account_ids } = (await req.json()) as {
      trend_name: string;
      trend_description?: string;
      account_ids: string[];
    };

    if (!trend_name || !account_ids?.length) {
      return NextResponse.json(
        { error: 'trend_name and account_ids[] are required' },
        { status: 400 }
      );
    }

    // Fetch accounts
    const { data: accounts, error: acctErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .in('id', account_ids);

    if (acctErr || !accounts?.length) {
      return NextResponse.json({ error: 'No valid accounts found' }, { status: 404 });
    }

    const client = getAnthropicClient();

    // Generate content for each account sequentially to avoid rate limits
    const results = [];
    for (const account of accounts) {
      const result = await generateForAccount(
        client,
        supabase,
        account,
        trend_name,
        trend_description ?? ''
      );
      results.push(result);
    }

    return NextResponse.json({
      total: results.length,
      success: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    });
  } catch (err) {
    console.error('bulk-generate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
