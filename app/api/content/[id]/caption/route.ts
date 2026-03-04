import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const CREATOMATE_API = 'https://api.creatomate.com/v1/renders';
const WORDS_PER_SECOND = 2.5; // natural speech rate
const WORDS_PER_CHUNK = 4;    // words shown at once

interface CaptionChunk {
  text: string;
  start: number; // seconds
  duration: number;
}

/**
 * Split a script into timed caption chunks.
 * Strips stage directions like "HOOK: ..." prefixes.
 */
function buildCaptionChunks(script: string): CaptionChunk[] {
  // Remove HOOK: prefix line if present
  const cleaned = script.replace(/^HOOK:.*\n\n?/i, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const chunks: CaptionChunk[] = [];
  let wordIndex = 0;
  let timeOffset = 0;

  while (wordIndex < words.length) {
    const slice = words.slice(wordIndex, wordIndex + WORDS_PER_CHUNK);
    const chunkDuration = slice.length / WORDS_PER_SECOND;
    chunks.push({
      text: slice.join(' '),
      start: timeOffset,
      duration: chunkDuration,
    });
    timeOffset += chunkDuration;
    wordIndex += WORDS_PER_CHUNK;
  }

  return chunks;
}

function buildRenderScript(videoUrl: string, chunks: CaptionChunk[], totalDuration: number) {
  const captionElements = chunks.map((chunk) => ({
    type: 'text',
    text: chunk.text.toUpperCase(), // all-caps subtitle style
    time: chunk.start,
    duration: chunk.duration,
    // Vertical position: lower third
    x: '50%',
    y: '78%',
    width: '88%',
    height: 'auto',
    x_anchor: '50%',
    y_anchor: '50%',
    font_family: 'Montserrat',
    font_weight: '800',
    font_size: '7.5 vmin',
    fill_color: '#FFFFFF',
    stroke_color: '#000000',
    stroke_width: '0.8 vmin',
    text_alignment: 'center',
    background_color: 'rgba(0,0,0,0)',
    shadow_color: 'rgba(0,0,0,0.6)',
    shadow_blur: '4 vmin',
    shadow_x: '0',
    shadow_y: '1 vmin',
  }));

  return {
    output_format: 'mp4',
    frame_rate: 30,
    width: 1080,
    height: 1920, // TikTok portrait
    duration: totalDuration,
    elements: [
      // Background video — loops if the clip is shorter than the script
      {
        type: 'video',
        source: videoUrl,
        time: 0,
        duration: totalDuration,
        fit: 'cover',
        volume: 1,
        loop: true,
      },
      // Caption text elements
      ...captionElements,
    ],
  };
}

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

    if (!process.env.CREATOMATE_API_KEY) {
      return NextResponse.json({ error: 'CREATOMATE_API_KEY not configured' }, { status: 500 });
    }

    // Fetch content
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id, script, video_url, engagement_metrics')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (!content.video_url) {
      return NextResponse.json({ error: 'No video attached — upload a video first' }, { status: 400 });
    }

    if (!content.script) {
      return NextResponse.json({ error: 'No script found on this content' }, { status: 400 });
    }

    // Get the URL Creatomate will fetch the video from.
    // External URLs (HeyGen, Runway) are already public — use directly.
    // Supabase storage paths need a signed URL.
    let videoUrlForCreatomate: string;
    if (content.video_url.startsWith('http')) {
      videoUrlForCreatomate = content.video_url;
    } else {
      const { data: signed, error: signError } = await supabase.storage
        .from('videos')
        .createSignedUrl(content.video_url, 3600);
      if (signError || !signed?.signedUrl) {
        return NextResponse.json({ error: 'Failed to get video URL' }, { status: 500 });
      }
      videoUrlForCreatomate = signed.signedUrl;
    }

    // Build caption chunks
    const chunks = buildCaptionChunks(content.script);
    const totalDuration = chunks.reduce((acc, c) => Math.max(acc, c.start + c.duration), 0);
    const renderScript = buildRenderScript(videoUrlForCreatomate, chunks, Math.ceil(totalDuration));

    // Submit render to Creatomate
    const renderRes = await fetch(CREATOMATE_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: renderScript }),
    });

    const renderData = await renderRes.json();

    if (!renderRes.ok) {
      console.error('creatomate render error:', renderData);
      return NextResponse.json({ error: renderData.message ?? 'Render submission failed' }, { status: 500 });
    }

    // Creatomate returns an array of renders
    const render = Array.isArray(renderData) ? renderData[0] : renderData;
    const renderId = render?.id;

    if (!renderId) {
      return NextResponse.json({ error: 'No render ID returned' }, { status: 500 });
    }

    // Store render ID so the client can poll status
    const metrics = (content.engagement_metrics ?? {}) as Record<string, unknown>;
    await supabase.from('content').update({
      engagement_metrics: {
        ...metrics,
        creatomate_render_id: renderId,
        caption_status: 'rendering',
      },
    }).eq('id', contentId);

    return NextResponse.json({
      render_id: renderId,
      status: render.status ?? 'planned',
      message: 'Caption render started — poll /api/content/[id]/caption/status to check progress',
    });

  } catch (err) {
    console.error('caption route error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
