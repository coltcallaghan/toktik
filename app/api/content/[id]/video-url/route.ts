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
