import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── POST /api/content/[id]/thumbnail ─────────────────────────── */
/* Generates thumbnail/cover ideas for a content item using AI.     */
/* Returns text descriptions + DALL-E/Stability prompt if keys set. */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: content, error: contentErr } = await supabase
      .from('content')
      .select('*, accounts(*)')
      .eq('id', id)
      .single();

    if (contentErr || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const client = getAnthropicClient();

    const account = content.accounts as Record<string, string> | null;
    const niche = account?.niche ?? 'General';

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You are a TikTok thumbnail and cover design expert. Generate 3 thumbnail concepts optimized for TikTok's vertical format (1080x1920).

Rules:
- Each concept needs: title_text (bold, max 6 words), subtitle_text (optional, max 8 words), color_scheme (2-3 hex colors), style (flat/gradient/photo_overlay/bold_text), image_prompt (detailed description for AI image generation)
- Make them eye-catching, high-contrast, mobile-optimized
- Use trending TikTok cover aesthetics
- Output ONLY valid JSON array`,
      messages: [
        {
          role: 'user',
          content: `Generate 3 thumbnail concepts for this TikTok:
Title: ${content.title}
Niche: ${niche}
Script preview: ${(content.script ?? '').slice(0, 200)}

Return JSON array: [{"title_text": "...", "subtitle_text": "...", "color_scheme": ["#hex1", "#hex2"], "style": "...", "image_prompt": "..."}]`,
        },
      ],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]';
    let concepts;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      concepts = JSON.parse(cleaned);
    } catch {
      concepts = [];
    }

    return NextResponse.json({
      content_id: id,
      concepts,
      has_image_api: !!(process.env.OPENAI_API_KEY || process.env.STABILITY_API_KEY),
    });
  } catch (err) {
    console.error('thumbnail generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
