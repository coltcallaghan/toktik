import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const niches: string[] = body.niches ?? [];
    const searchTopic: string = body.search_topic ?? '';

    // Claude: generate & score trend opportunities
    const client = getAnthropicClient();

    const focusLine = searchTopic
      ? `The user is specifically searching for trends around: "${searchTopic}". Focus all 6 trends on this topic and related angles.`
      : niches.length
        ? `Focus on these niches: ${niches.join(', ')}`
        : 'Cover a broad range of popular niches.';

    const trendsMsg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a social media trend analyst. Today is ${new Date().toDateString()}.

${focusLine}

Identify 6 current social media trend opportunities that creators should act on NOW.

Respond with ONLY valid JSON — no markdown, no explanation, no code fences:
{
  "trends": [
    {
      "trend_name": "string",
      "category": "string",
      "momentum": 0,
      "description": "string",
      "best_hook": "string",
      "expires_days": 0,
      "opportunity_score": 0,
      "opportunity_reason": "string"
    }
  ],
  "top_pick": "string",
  "top_pick_reason": "string"
}`
      }]
    });

    const rawText = trendsMsg.content[0].type === 'text' ? trendsMsg.content[0].text.trim() : '';

    // Strip any accidental markdown code fences Claude might add
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: {
      trends: Array<{
        trend_name: string;
        category: string;
        momentum: number;
        description: string;
        best_hook: string;
        expires_days: number;
        opportunity_score: number;
        opportunity_reason: string;
      }>;
      top_pick: string;
      top_pick_reason: string;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('fetch-trends: failed to parse Claude response:', cleaned.slice(0, 200));
      return NextResponse.json({ error: 'AI returned malformed JSON. Please try again.' }, { status: 500 });
    }

    if (!Array.isArray(parsed.trends) || parsed.trends.length === 0) {
      return NextResponse.json({ error: 'AI returned no trends. Please try again.' }, { status: 500 });
    }

    const now = new Date();
    const rows = parsed.trends.map((t) => ({
      user_id: user.id,
      trend_name: t.trend_name,
      category: t.category,
      momentum: Math.min(100, Math.max(0, Number(t.momentum) || 50)),
      description: `${t.description} | Hook: "${t.best_hook}" | Opportunity (${t.opportunity_score}/100): ${t.opportunity_reason}`,
      detected_at: now.toISOString(),
      expires_at: new Date(now.getTime() + (Number(t.expires_days) || 7) * 86400000).toISOString(),
    }));

    // Topic search: return results only, don't save to DB
    if (searchTopic) {
      return NextResponse.json({
        trends: parsed.trends,
        search_results: rows, // client renders these separately
        top_pick: parsed.top_pick,
        top_pick_reason: parsed.top_pick_reason,
      });
    }

    // General analyse: replace saved trends
    await supabase.from('trends').delete().eq('user_id', user.id);
    const { error: insertError } = await supabase.from('trends').insert(rows);
    if (insertError) {
      console.error('fetch-trends: supabase insert error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      trends: parsed.trends,
      top_pick: parsed.top_pick,
      top_pick_reason: parsed.top_pick_reason,
    });

  } catch (err) {
    console.error('fetch-trends unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
