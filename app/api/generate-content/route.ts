import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { GenerateContentRequest, GenerateContentResponse } from '@/lib/types';
import type { Account } from '@/lib/supabase';

async function runAgent(client: Anthropic, systemPrompt: string, userPrompt: string): Promise<string> {
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
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

function buildThemeContext(account: Account): string {
  const lines: string[] = [];
  if (account.niche)           lines.push(`Niche: ${account.niche}`);
  if (account.tone)            lines.push(`Tone: ${account.tone}`);
  if (account.content_style)   lines.push(`Content style: ${account.content_style}`);
  if (account.target_audience) lines.push(`Target audience: ${account.target_audience}`);
  if (account.posting_goals)   lines.push(`Posting goals: ${account.posting_goals}`);
  if (account.brand_voice)     lines.push(`Brand voice notes: ${account.brand_voice}`);
  return lines.length > 0 ? `\n\nACCOUNT THEME:\n${lines.join('\n')}` : '';
}

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

    const body: GenerateContentRequest = await req.json();
    const { trend_name, trend_description, account_id } = body;

    if (!trend_name || !account_id) {
      return NextResponse.json({ error: 'trend_name and account_id are required' }, { status: 400 });
    }

    // Fetch the full account so we can use its theme
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const client = getAnthropicClient();
    const nicheContext = account.niche ?? body.niche ?? 'General TikTok';
    const themeContext = buildThemeContext(account);
    const accountUsername = account.platform_username;

    // ── Agent 1: Title & Hook ──────────────────────────────────────────────────
    const titleRaw = await runAgent(
      client,
      `You are a viral TikTok title and hook strategist.
Rules:
- Title: max 60 chars, curiosity-driven, no clickbait
- Hook: first spoken line, max 15 words, creates immediate tension or curiosity
- Match the account's tone and audience exactly
- Output ONLY valid JSON — no markdown, no code fences`,
      `Trend: ${trend_name}
Context: ${trend_description}
Niche: ${nicheContext}
Account: ${accountUsername}${themeContext}

Respond with ONLY: {"title": "...", "hook": "..."}`
    );

    const { title = 'Trending Content', hook = '' } = parseJSON<{ title: string; hook: string }>(
      titleRaw, { title: 'Trending Content', hook: '' }
    );

    // ── Agent 2: Script ────────────────────────────────────────────────────────
    const script = await runAgent(
      client,
      `You are an expert TikTok script writer.
Rules:
- 60 seconds max when read aloud (~130 words)
- Start directly with the hook as the first line — do NOT label it
- Short sentences. Urgency. Build to a payoff.
- End with a specific call-to-action that matches the account's posting goals
- Write in the account's exact tone and style
- Write ONLY the script text — no labels, no markdown, no stage directions`,
      `Trend: ${trend_name}
Opening hook (use as first line): ${hook}
Niche: ${nicheContext}
Title: ${title}${themeContext}

Write the complete script now:`
    );

    // ── Agent 3: Caption & Hashtags ────────────────────────────────────────────
    const captionRaw = await runAgent(
      client,
      `You are a TikTok SEO and caption specialist.
Rules:
- Caption: 1-2 punchy sentences, includes a question or CTA that fits the account's goals
- Hashtags: exactly 8 — mix trending, niche-specific, and long-tail for the target audience
- Match the account's tone throughout
- Output ONLY valid JSON — no markdown, no code fences`,
      `Title: ${title}
Trend: ${trend_name}
Niche: ${nicheContext}${themeContext}

Respond with ONLY: {"caption": "...", "hashtags": ["#tag1", "#tag2", ...]}`
    );

    const { caption: captions = '', hashtags = [] } = parseJSON<{ caption: string; hashtags: string[] }>(
      captionRaw, { caption: '', hashtags: [] }
    );

    // ── Save draft ─────────────────────────────────────────────────────────────
    const fullScript = hook ? `HOOK: ${hook}\n\n${script}` : script;
    const fullCaption = `${captions}\n\n${(hashtags as string[]).slice(0, 8).join(' ')}`.trim();

    const { data: saved, error: saveError } = await supabase
      .from('content')
      .insert({
        account_id,
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

    if (saveError) {
      console.error('generate-content: supabase insert error:', saveError.message);
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    const response: GenerateContentResponse = {
      title,
      hook,
      script,
      captions,
      hashtags: (hashtags as string[]).slice(0, 8),
      content_id: saved.id,
    };

    return NextResponse.json(response);

  } catch (err) {
    console.error('generate-content unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
