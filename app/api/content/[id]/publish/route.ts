import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Fetch content + account (with TikTok token)
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select(`
        id, title, script, video_url, status, engagement_metrics,
        accounts (
          id, platform_username, tiktok_access_token, tiktok_open_id
        )
      `)
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    type AccountRow = { id: string; platform_username: string; tiktok_access_token: string | null; tiktok_open_id: string | null };
    const accountRaw = content.accounts as unknown;
    const account: AccountRow | null = Array.isArray(accountRaw) ? (accountRaw[0] ?? null) : (accountRaw as AccountRow | null);

    if (!account?.tiktok_access_token) {
      return NextResponse.json({ error: 'Account has no TikTok connection — connect via OAuth first' }, { status: 400 });
    }

    if (!content.video_url) {
      return NextResponse.json({ error: 'No video attached — upload a video first' }, { status: 400 });
    }

    // Get a signed URL for the video (TikTok needs a public URL to fetch from)
    const { data: signed, error: signError } = await supabase.storage
      .from('videos')
      .createSignedUrl(content.video_url, 300); // 5 min

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Failed to get video URL' }, { status: 500 });
    }

    // Extract caption from engagement_metrics
    const metrics = content.engagement_metrics as { caption?: string } | null;
    const caption = metrics?.caption ?? content.title;

    // ── Step 1: Initialise upload ──────────────────────────────────────────────
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.tiktok_access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 2200), // TikTok caption limit
          privacy_level: 'SELF_ONLY',    // Safe default — user can change in TikTok app
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: signed.signedUrl,
        },
      }),
    });

    const initData = await initRes.json();

    if (initData.error?.code !== 'ok') {
      console.error('tiktok publish init error:', initData.error);
      // Mark as failed in DB
      await supabase.from('content').update({ status: 'failed' }).eq('id', contentId);
      return NextResponse.json({ error: initData.error?.message ?? 'TikTok publish failed' }, { status: 500 });
    }

    const publishId = initData.data?.publish_id;

    // ── Mark as published in DB ────────────────────────────────────────────────
    await supabase.from('content').update({
      status: 'published',
      published_at: new Date().toISOString(),
      engagement_metrics: {
        ...(metrics ?? {}),
        tiktok_publish_id: publishId,
      },
    }).eq('id', contentId);

    return NextResponse.json({ success: true, publish_id: publishId });

  } catch (err) {
    console.error('publish error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
