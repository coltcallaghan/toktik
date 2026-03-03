import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentId } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: content } = await supabase
      .from('content')
      .select('id, engagement_metrics')
      .eq('id', contentId)
      .single();

    if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const metrics = (content.engagement_metrics ?? {}) as Record<string, unknown>;
    const renderId = metrics.creatomate_render_id as string | undefined;

    if (!renderId) {
      return NextResponse.json({ status: 'not_started' });
    }

    // Already finished
    if (metrics.caption_status === 'done') {
      return NextResponse.json({
        status: 'done',
        captioned_url: metrics.captioned_video_url,
      });
    }

    // Poll Creatomate
    const res = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
      headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` },
    });

    const render = await res.json();

    if (render.status === 'succeeded') {
      const captionedUrl = render.url as string;

      // Store the final video URL in engagement_metrics
      await supabase.from('content').update({
        engagement_metrics: {
          ...metrics,
          caption_status: 'done',
          captioned_video_url: captionedUrl,
        },
        // Update video_url to point to the captioned version
        video_url: captionedUrl,
      }).eq('id', contentId);

      return NextResponse.json({ status: 'done', captioned_url: captionedUrl });
    }

    if (render.status === 'failed') {
      await supabase.from('content').update({
        engagement_metrics: { ...metrics, caption_status: 'failed' },
      }).eq('id', contentId);
      return NextResponse.json({ status: 'failed', error: render.error_message ?? 'Render failed' });
    }

    // Still in progress
    return NextResponse.json({ status: render.status ?? 'rendering', progress: render.progress ?? 0 });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
