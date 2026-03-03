import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── POST: Poll Creatomate render status & update video URL ────────── */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { render_id } = await req.json() as { render_id: string };
    if (!render_id) {
      return NextResponse.json({ error: 'render_id required' }, { status: 400 });
    }

    const creatomateKey = process.env.CREATOMATE_API_KEY;
    if (!creatomateKey) {
      return NextResponse.json({ error: 'Creatomate not configured' }, { status: 500 });
    }

    // Poll Creatomate for render status
    const statusRes = await fetch(`https://api.creatomate.com/v1/renders/${render_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creatomateKey}`,
      },
    });

    if (!statusRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch render status' }, { status: statusRes.status });
    }

    const renderData = await statusRes.json() as {
      status: string;
      output_url?: string;
      error?: string;
    };

    // Update content with video URL if render is done
    if (renderData.status === 'done' && renderData.output_url) {
      const { data: content } = await supabase
        .from('content')
        .select('id, engagement_metrics')
        .eq('id', contentId)
        .eq('user_id', user.id)
        .single();

      if (content) {
        await supabase
          .from('content')
          .update({
            video_url: renderData.output_url,
            engagement_metrics: {
              ...(content.engagement_metrics as Record<string, unknown> ?? {}),
              video_status: 'done',
              creatomate_render_id: render_id,
            },
          })
          .eq('id', contentId);
      }
    }

    return NextResponse.json({
      render_id,
      status: renderData.status,
      video_url: renderData.output_url ?? null,
      error: renderData.error ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

/* ── GET: Fetch video URL (check if ready or fetch from Supabase) ───── */

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
      .select('id, video_url, engagement_metrics')
      .eq('id', contentId)
      .single();

    if (!content?.video_url) {
      return NextResponse.json({ error: 'No video found' }, { status: 404 });
    }

    const metrics = (content.engagement_metrics ?? {}) as Record<string, unknown>;
    const captionedUrl = metrics.captioned_video_url as string | undefined;

    // If captions are done, captioned_video_url is already a public Creatomate URL
    if (captionedUrl) {
      return NextResponse.json({ url: captionedUrl, captioned: true });
    }

    // Otherwise create a signed URL for the Supabase storage path
    const { data: signed, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(content.video_url, 3600);

    if (error || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl, captioned: false });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
