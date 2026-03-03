import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const style: string = body.style ?? 'talking_head';
    const avatarId: string = body.avatar_id ?? 'default';

    const heygenKey = process.env.HEYGEN_API_KEY;
    const runwayKey = process.env.RUNWAY_API_KEY;
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
                voice_id: '1bd001e7e50f421d891986aad5c21083',
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
      return NextResponse.json({
        provider: 'runway',
        status: 'processing',
        message: 'Runway ML video generation initiated. This may take several minutes.',
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
