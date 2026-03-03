import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── POST /api/content/[id]/repurpose ─────────────────────────── */
/* Takes a TikTok content item and adapts it for other platforms.    */

const PLATFORM_SPECS: Record<string, { name: string; maxLength: number; format: string; aspect: string }> = {
  youtube_shorts: { name: 'YouTube Shorts', maxLength: 60, format: 'vertical 9:16', aspect: '1080x1920' },
  instagram_reels: { name: 'Instagram Reels', maxLength: 90, format: 'vertical 9:16', aspect: '1080x1920' },
  twitter: { name: 'X / Twitter', maxLength: 280, format: 'text + media', aspect: '1200x675 or 9:16' },
  linkedin: { name: 'LinkedIn', maxLength: 3000, format: 'text post or video', aspect: '1080x1080 or 9:16' },
  facebook_reels: { name: 'Facebook Reels', maxLength: 60, format: 'vertical 9:16', aspect: '1080x1920' },
};

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

    const { data: content } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();

    if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

    const body = await req.json();
    const platforms: string[] = body.platforms ?? ['youtube_shorts', 'instagram_reels'];

    const client = getAnthropicClient();
    const caption = (content.engagement_metrics as Record<string, string>)?.caption ?? '';

    const results: Record<string, unknown> = {};

    for (const platform of platforms) {
      const spec = PLATFORM_SPECS[platform];
      if (!spec) continue;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: `You are a social media content repurposing expert. Adapt TikTok content for ${spec.name}.

Rules:
- Keep the core message but adapt tone for ${spec.name} audience
- Script must fit ${spec.maxLength}s when read aloud
- Caption must work for ${spec.name} (platform-specific hashtags, tone)
- Include platform-specific tips
- Output ONLY valid JSON`,
        messages: [
          {
            role: 'user',
            content: `Repurpose this TikTok for ${spec.name}:

Title: ${content.title}
Script: ${content.script?.slice(0, 500)}
Caption: ${caption.slice(0, 200)}
Format: ${spec.format}, ${spec.aspect}

Return JSON: {"title": "...", "script": "...", "caption": "...", "hashtags": ["..."], "tips": ["..."]}`,
          },
        ],
      });

      const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        results[platform] = { ...JSON.parse(cleaned), platform_spec: spec };
      } catch {
        results[platform] = { error: 'Failed to parse', raw };
      }
    }

    return NextResponse.json({
      content_id: id,
      original_title: content.title,
      repurposed: results,
    });
  } catch (err) {
    console.error('repurpose error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
