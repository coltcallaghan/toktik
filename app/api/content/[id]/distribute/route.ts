import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentId } = await params;
    const { account_ids } = await req.json() as { account_ids: string[] };

    if (!account_ids?.length) {
      return NextResponse.json({ error: 'No accounts selected' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch content
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id, title, script, video_url, engagement_metrics')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (!content.video_url) {
      return NextResponse.json({ error: 'No video attached — upload or generate a video first' }, { status: 400 });
    }

    // Fetch target accounts (must belong to this user)
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, platform, platform_username, tiktok_access_token, platform_access_token')
      .in('id', account_ids)
      .eq('user_id', user.id);

    if (accError || !accounts?.length) {
      return NextResponse.json({ error: 'No valid accounts found' }, { status: 404 });
    }

    // Resolve video URL — external URLs are already public; Supabase paths need signing
    let publicVideoUrl: string;
    if (content.video_url.startsWith('http')) {
      publicVideoUrl = content.video_url;
    } else {
      const { data: signed, error: signError } = await supabase.storage
        .from('videos')
        .createSignedUrl(content.video_url, 600);
      if (signError || !signed?.signedUrl) {
        return NextResponse.json({ error: 'Failed to get video URL' }, { status: 500 });
      }
      publicVideoUrl = signed.signedUrl;
    }

    const caption = (content.engagement_metrics as { caption?: string } | null)?.caption ?? content.title;
    const results: Record<string, { ok: boolean; message: string }> = {};

    for (const account of accounts) {
      if (account.platform === 'tiktok') {
        const token = account.tiktok_access_token;
        if (!token) {
          results[account.id] = { ok: false, message: 'TikTok not connected — reconnect in Accounts' };
          continue;
        }

        try {
          const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
              post_info: {
                title: caption.slice(0, 2200),
                privacy_level: 'SELF_ONLY',
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false,
              },
              source_info: {
                source: 'PULL_FROM_URL',
                video_url: publicVideoUrl,
              },
            }),
          });

          const initData = await initRes.json();
          if (initData.error?.code !== 'ok') {
            results[account.id] = { ok: false, message: initData.error?.message ?? 'TikTok publish failed' };
          } else {
            results[account.id] = { ok: true, message: 'Posted to TikTok!' };
          }
        } catch {
          results[account.id] = { ok: false, message: 'TikTok request failed' };
        }

      } else {
        // Other platforms: OAuth stored but direct upload API not yet integrated
        results[account.id] = {
          ok: false,
          message: `Direct upload to ${account.platform} coming soon — download the video and post manually`,
        };
      }
    }

    return NextResponse.json({ results });

  } catch (err) {
    console.error('distribute error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
