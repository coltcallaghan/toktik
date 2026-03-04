import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import RunwayML from '@runwayml/sdk';
import Anthropic from '@anthropic-ai/sdk';
import { getUserApiKey } from '@/app/api/user-api-keys/route';

/* ── POST /api/content/[id]/generate-video ────────────────────── */
/* Initiates AI video generation for a content item.                */
/* Supports HeyGen, Runway ML, or returns a stub for configuration. */

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

    // Get content
    const { data: content, error: contentErr } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();

    if (contentErr || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const body = await req.json();
    const provider: string = body.provider ?? 'creatomate';
    const avatarId: string = body.avatar_id ?? 'Abigail_expressive_2024112501';
    const voiceId: string = body.voice_id ?? 'f38a635bee7a4d1f9b0a654a31d050d2';

    // User keys take priority over server env vars
    const [userRunway, userHeygen] = await Promise.all([
      getUserApiKey(user.id, 'runway'),
      getUserApiKey(user.id, 'heygen'),
    ]);

    const heygenKey = userHeygen ?? process.env.HEYGEN_API_KEY;
    const runwayKey = userRunway ?? process.env.RUNWAY_API_KEY;
    const creatomateKey = process.env.CREATOMATE_API_KEY;

    // Update content to "generating" state
    await supabase
      .from('content')
      .update({
        engagement_metrics: {
          ...(content.engagement_metrics as Record<string, unknown> ?? {}),
          video_status: 'generating',
          video_provider: provider,
        },
      })
      .eq('id', id);

    if (provider === 'heygen' && heygenKey) {
      // HeyGen API call
      const scriptText = (content.script ?? '').replace(/^HOOK:.*\n\n?/i, '').trim();

      const heygenRes = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'x-api-key': heygenKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: avatarId !== 'default' ? avatarId : 'Daisy-inskirt-20220818',
                avatar_style: 'normal',
              },
              voice: {
                type: 'text',
                input_text: scriptText.slice(0, 1500),
                voice_id: voiceId,
              },
            },
          ],
          dimension: { width: 1080, height: 1920 },
        }),
      });

      if (!heygenRes.ok) {
        const errBody = await heygenRes.text();
        return NextResponse.json(
          { error: 'HeyGen API error', details: errBody },
          { status: heygenRes.status }
        );
      }

      const heygenData = await heygenRes.json();
      return NextResponse.json({
        provider: 'heygen',
        status: 'processing',
        video_id: heygenData.data?.video_id,
        message: 'Video is being generated. Check back in a few minutes.',
      });
    }

    if (provider === 'runway' && runwayKey) {
      // Use Claude to turn the script into a concise visual video prompt
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const promptRes = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Convert this TikTok script into a short visual video prompt (max 100 words) for an AI video generator. Describe ONLY the visuals — dynamic scenes, movement, setting, mood, colours. No text, no narration, no avatars. Make it TikTok-native and energetic. Output the prompt only, no explanation.\n\nTitle: ${content.title}\nScript: ${(content.script ?? '').slice(0, 600)}`,
        }],
      });

      const visualPrompt = (promptRes.content[0] as { text: string }).text.trim();

      const runway = new RunwayML({ apiKey: runwayKey });

      const task = await runway.textToVideo.create({
        model: 'gen4.5',
        promptText: visualPrompt,
        ratio: '720:1280', // 9:16 vertical for TikTok
        duration: 5,
      });

      // Save task ID so we can poll later
      await supabase
        .from('content')
        .update({
          engagement_metrics: {
            ...(content.engagement_metrics as Record<string, unknown> ?? {}),
            video_status: 'processing',
            video_provider: 'runway',
            runway_task_id: task.id,
            runway_prompt: visualPrompt,
          },
        })
        .eq('id', id);

      return NextResponse.json({
        provider: 'runway',
        status: 'processing',
        task_id: task.id,
        prompt_used: visualPrompt,
        message: 'Runway Gen-4 video generation started. Takes 2-5 minutes.',
      });
    }

    if (provider === 'creatomate' && creatomateKey) {
      // Creatomate API: Creates a render job for TikTok/Shorts
      const scriptText = (content.script ?? '').replace(/^HOOK:.*\n\n?/i, '').trim();

      const creatomateRes = await fetch('https://api.creatomate.com/v1/renders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creatomateKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            type: 'template',
            template_id: 'vertical_video_script',
          },
          variables: {
            'text': scriptText.slice(0, 500),
            'title': content.title,
            'aspect_ratio': '9:16',
          },
          output_format: 'mp4',
        }),
      });

      if (!creatomateRes.ok) {
        const errBody = await creatomateRes.text();
        return NextResponse.json(
          { error: 'Creatomate API error', details: errBody },
          { status: creatomateRes.status }
        );
      }

      const creatomateData = await creatomateRes.json();
      await supabase
        .from('content')
        .update({
          engagement_metrics: {
            ...(content.engagement_metrics as Record<string, unknown> ?? {}),
            video_status: 'processing',
            creatomate_render_id: creatomateData.id,
          },
        })
        .eq('id', id);

      return NextResponse.json({
        provider: 'creatomate',
        status: 'processing',
        render_id: creatomateData.id,
        message: 'Video is being rendered on Creatomate. Check back in 1-5 minutes.',
      });
    }

    // Fallback: No API key configured
    return NextResponse.json({
      provider,
      status: 'not_configured',
      message: `${
        provider === 'heygen'
          ? 'HEYGEN_API_KEY'
          : provider === 'runway'
          ? 'RUNWAY_API_KEY'
          : 'CREATOMATE_API_KEY'
      } not configured. Add it to your .env to enable AI video generation.`,
      supported_providers: [
        { name: 'Creatomate', env: 'CREATOMATE_API_KEY', features: ['Vertical video templates', 'TikTok/Shorts ready', 'Fast rendering'] },
        { name: 'HeyGen', env: 'HEYGEN_API_KEY', features: ['Talking head avatars', 'AI presenters', 'Custom backgrounds'] },
        { name: 'Runway ML', env: 'RUNWAY_API_KEY', features: ['Gen-2 video generation', 'Image-to-video', 'Text-to-video'] },
      ],
    });
  } catch (err) {
    console.error('video generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
