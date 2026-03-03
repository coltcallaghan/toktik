import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── POST /api/trends/predict ───────────────────────────────────── */

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
    const niches: string[] = body.niches ?? [];

    // Fetch current trends + accounts for context
    const [trendsRes, accountsRes] = await Promise.all([
      supabase.from('trends').select('trend_name, description, category').limit(30),
      supabase.from('accounts').select('niche, platform_username').eq('user_id', user.id),
    ]);

    const existingTrends = trendsRes.data ?? [];
    const accounts = accountsRes.data ?? [];
    const accountNiches = [...new Set(accounts.map((a) => a.niche).filter(Boolean))];
    const allNiches = [...new Set([...niches, ...accountNiches])];

    const client = getAnthropicClient();

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: `You are a TikTok trend forecasting expert. Analyze current trends and predict upcoming viral topics.

Rules:
- Return a JSON array of 6-8 predicted trends
- Each must have: name, description, category, virality_score (0-100), time_horizon ("now"|"1-2 days"|"3-5 days"|"1-2 weeks"), niche_fit (array of matching niches from the user's list), confidence (0-100)
- Focus on trends that are RISING, not already peaked
- Consider seasonal events, memes, sounds, challenges
- virality_score = predicted peak reach potential
- confidence = how sure you are this will trend
- Output ONLY valid JSON — no markdown, no code fences`,
      messages: [
        {
          role: 'user',
          content: `Current known trends:\n${existingTrends.map((t) => `- ${t.trend_name}: ${t.description}`).join('\n')}\n\nUser's niches: ${allNiches.join(', ') || 'General'}\n\nPredict upcoming TikTok trends. Return JSON array only.`,
        },
      ],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]';
    let predictions;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      predictions = JSON.parse(cleaned);
    } catch {
      predictions = [];
    }

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error('trend-predict error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
