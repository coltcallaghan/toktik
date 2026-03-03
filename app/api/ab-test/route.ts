import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Account } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Helpers (shared with generate-content)                             */
/* ------------------------------------------------------------------ */

async function runAgent(client: Anthropic, systemPrompt: string, userPrompt: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
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
  if (account.niche) lines.push(`Niche: ${account.niche}`);
  if (account.tone) lines.push(`Tone: ${account.tone}`);
  if (account.content_style) lines.push(`Content style: ${account.content_style}`);
  if (account.target_audience) lines.push(`Target audience: ${account.target_audience}`);
  if (account.posting_goals) lines.push(`Posting goals: ${account.posting_goals}`);
  if (account.brand_voice) lines.push(`Brand voice notes: ${account.brand_voice}`);
  return lines.length > 0 ? `\n\nACCOUNT THEME:\n${lines.join('\n')}` : '';
}

const VARIANT_LABELS = ['A', 'B', 'C', 'D', 'E'];

/* ------------------------------------------------------------------ */
/*  POST /api/ab-test — create a new A/B test with N variants          */
/* ------------------------------------------------------------------ */

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

    const body = await req.json();
    const {
      name,
      trend_name,
      trend_description = '',
      account_id,
      variant_count = 2,
    } = body as {
      name: string;
      trend_name: string;
      trend_description?: string;
      account_id: string;
      variant_count?: number;
    };

    if (!name || !trend_name || !account_id) {
      return NextResponse.json(
        { error: 'name, trend_name, and account_id are required' },
        { status: 400 }
      );
    }

    const count = Math.min(Math.max(variant_count, 2), 5); // 2–5 variants

    // Fetch account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Create the A/B test record
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .insert({
        user_id: user.id,
        name,
        trend_name,
        description: `Testing ${count} variations of "${trend_name}" on @${account.platform_username}`,
        status: 'active',
      })
      .select('id')
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: testError?.message ?? 'Failed to create test' }, { status: 500 });
    }

    // Generate N variants using Claude
    const client = getAnthropicClient();
    const themeContext = buildThemeContext(account);
    const niche = account.niche ?? 'General TikTok';

    const variantsRaw = await runAgent(
      client,
      `You are a TikTok A/B testing strategist. You generate DISTINCT content variations to test which performs best.

Rules:
- Each variant must have a DIFFERENT hook angle, tone twist, or structural approach
- Variant A: Direct/standard approach
- Variant B: Contrarian or unexpected angle
- Variant C+: Creative alternatives (humor, story, question-led, etc.)
- Each script: ~130 words (60 sec read), start with hook, end with CTA
- Each title: max 60 chars
- Each caption: 1-2 sentences + exactly 8 hashtags
- Output ONLY valid JSON array — no markdown, no code fences`,
      `Generate exactly ${count} distinct TikTok content variations.

Trend: ${trend_name}
Context: ${trend_description}
Niche: ${niche}
Account: @${account.platform_username}${themeContext}

Respond with ONLY a JSON array:
[
  {
    "title": "...",
    "hook": "...",
    "script": "...",
    "caption": "...",
    "hashtags": ["#tag1", ...],
    "angle": "brief description of this variant's unique angle"
  },
  ...
]`
    );

    type VariantData = {
      title: string;
      hook: string;
      script: string;
      caption: string;
      hashtags: string[];
      angle: string;
    };

    const variants = parseJSON<VariantData[]>(variantsRaw, []);

    if (variants.length === 0) {
      // Cleanup the test
      await supabase.from('ab_tests').delete().eq('id', test.id);
      return NextResponse.json(
        { error: 'AI failed to generate variants. Please try again.' },
        { status: 500 }
      );
    }

    // Insert each variant as a content draft linked to the test
    const insertedVariants: { id: string; label: string; title: string }[] = [];

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const label = VARIANT_LABELS[i] ?? `V${i + 1}`;
      const fullCaption = `${v.caption}\n\n${v.hashtags.slice(0, 8).join(' ')}`.trim();

      const { data: saved, error: saveError } = await supabase
        .from('content')
        .insert({
          account_id,
          team_id: null,
          title: `[${label}] ${v.title}`,
          script: v.hook ? `${v.hook}\n\n${v.script}` : v.script,
          video_url: null,
          status: 'draft' as const,
          scheduled_at: null,
          published_at: null,
          engagement_metrics: { caption: fullCaption, angle: v.angle },
          ab_test_id: test.id,
          variant_label: label,
        })
        .select('id')
        .single();

      if (!saveError && saved) {
        insertedVariants.push({ id: saved.id, label, title: v.title });
      }
    }

    return NextResponse.json({
      test_id: test.id,
      variants: insertedVariants,
      variant_count: insertedVariants.length,
    });
  } catch (err) {
    console.error('ab-test create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/ab-test — list all A/B tests for the current user         */
/* ------------------------------------------------------------------ */

export async function GET() {
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

    const { data: tests, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tests: tests ?? [] });
  } catch (err) {
    console.error('ab-test list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
