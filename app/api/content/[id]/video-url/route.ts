import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import RunwayML from '@runwayml/sdk';

/* ── POST: Poll render status (Creatomate or HeyGen) & update video URL */

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

    const body = await req.json() as { render_id?: string; video_id?: string; task_id?: string; provider?: string };
    const provider = body.provider ?? (body.video_id ? 'heygen' : body.task_id ? 'runway' : 'creatomate');

    // ── HeyGen polling ────────────────────────────────────────────────
    if (provider === 'heygen') {
      const { video_id } = body;
      if (!video_id) return NextResponse.json({ error: 'video_id required for HeyGen' }, { status: 400 });

      const heygenKey = process.env.HEYGEN_API_KEY;
      if (!heygenKey) return NextResponse.json({ error: 'HeyGen not configured' }, { status: 500 });

      const statusRes = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${video_id}`, {
        headers: { 'x-api-key': heygenKey },
      });

      if (!statusRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch HeyGen status' }, { status: statusRes.status });
      }

      const heygenData = await statusRes.json() as {
        code: number;
        data: {
          status: string;       // "pending" | "processing" | "completed" | "failed"
          video_url?: string;
          video_url_caption?: string;
          thumbnail_url?: string;
          error?: { code: number; message: string };
        };
      };

      const { status, video_url, thumbnail_url, error: heygenErr } = heygenData.data;

      if (status === 'completed' && video_url) {
        const { data: content } = await supabase
          .from('content')
          .select('id, engagement_metrics')
          .eq('id', contentId)
          .single();

        if (content) {
          await supabase
            .from('content')
            .update({
              video_url,
              engagement_metrics: {
                ...(content.engagement_metrics as Record<string, unknown> ?? {}),
                video_status: 'done',
                video_provider: 'heygen',
                heygen_video_id: video_id,
                thumbnail_url: thumbnail_url ?? null,
              },
            })
            .eq('id', contentId);
        }
      }

      if (status === 'failed') {
        await supabase
          .from('content')
          .update({
            engagement_metrics: {
              video_status: 'failed',
              video_provider: 'heygen',
              heygen_video_id: video_id,
              heygen_error: heygenErr?.message ?? 'Unknown error',
            },
          })
          .eq('id', contentId);
      }

      return NextResponse.json({
        provider: 'heygen',
        video_id,
        status,
        video_url: video_url ?? null,
        thumbnail_url: thumbnail_url ?? null,
        error: heygenErr?.message ?? null,
      });
    }

    // ── Runway polling ────────────────────────────────────────────────
    if (provider === 'runway') {
      const { task_id } = body;
      if (!task_id) return NextResponse.json({ error: 'task_id required for Runway' }, { status: 400 });

      const runwayKey = process.env.RUNWAY_API_KEY;
      if (!runwayKey) return NextResponse.json({ error: 'Runway not configured' }, { status: 500 });

      const runway = new RunwayML({ apiKey: runwayKey });
      const task = await runway.tasks.retrieve(task_id);

      // status: PENDING | RUNNING | SUCCEEDED | FAILED | CANCELLED
      if (task.status === 'SUCCEEDED' && task.output?.[0]) {
        const videoUrl = task.output[0] as string;
        const { data: content } = await supabase
          .from('content')
          .select('id, engagement_metrics')
          .eq('id', contentId)
          .single();

        if (content) {
          await supabase
            .from('content')
            .update({
              video_url: videoUrl,
              engagement_metrics: {
                ...(content.engagement_metrics as Record<string, unknown> ?? {}),
                video_status: 'done',
                video_provider: 'runway',
                runway_task_id: task_id,
              },
            })
            .eq('id', contentId);
        }

        return NextResponse.json({ provider: 'runway', task_id, status: 'SUCCEEDED', video_url: videoUrl });
      }

      if (task.status === 'FAILED') {
        await supabase
          .from('content')
          .update({ engagement_metrics: { video_status: 'failed', video_provider: 'runway' } })
          .eq('id', contentId);
      }

      return NextResponse.json({
        provider: 'runway',
        task_id,
        status: task.status,
        video_url: null,
        error: task.status === 'FAILED' ? 'Runway generation failed' : null,
      });
    }

    // ── Creatomate polling ────────────────────────────────────────────
    const { render_id } = body;
    if (!render_id) return NextResponse.json({ error: 'render_id required' }, { status: 400 });

    const creatomateKey = process.env.CREATOMATE_API_KEY;
    if (!creatomateKey) return NextResponse.json({ error: 'Creatomate not configured' }, { status: 500 });

    const statusRes = await fetch(`https://api.creatomate.com/v1/renders/${render_id}`, {
      headers: { 'Authorization': `Bearer ${creatomateKey}` },
    });

    if (!statusRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch render status' }, { status: statusRes.status });
    }

    const renderData = await statusRes.json() as {
      status: string;
      output_url?: string;
      error?: string;
    };

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
      provider: 'creatomate',
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
    const videoProvider = metrics.video_provider as string | undefined;

    // HeyGen/Creatomate return public https:// URLs — return directly, no signing needed.
    // Also skip captioned_video_url for externally-generated videos since it belongs to a previous upload.
    if (content.video_url.startsWith('http://') || content.video_url.startsWith('https://')) {
      const isCaptioned = !!captionedUrl && videoProvider !== 'heygen' && videoProvider !== 'creatomate';
      return NextResponse.json({ url: captionedUrl && isCaptioned ? captionedUrl : content.video_url, captioned: isCaptioned });
    }

    // If captions are done on an uploaded video, captioned_video_url wins
    if (captionedUrl) {
      return NextResponse.json({ url: captionedUrl, captioned: true });
    }

    // Otherwise it's a Supabase storage path — create a signed URL
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
