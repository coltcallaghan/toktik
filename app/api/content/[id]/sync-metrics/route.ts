import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/content/[id]/sync-metrics
 *
 * Fetches engagement metrics from TikTok API and updates content record.
 * Call this after content is published to track real-time performance.
 *
 * Requires: Content has video_id from TikTok (stored after publishing)
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Fetch content with account info
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select(`
        id, title, status, engagement_metrics,
        accounts (
          id, platform_username, tiktok_access_token, tiktok_open_id
        )
      `)
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.status !== 'published') {
      return NextResponse.json(
        { error: 'Only published content can be synced' },
        { status: 400 }
      );
    }

    const accountRaw = content.accounts as unknown;
    const account: {
      tiktok_access_token: string | null;
      tiktok_open_id: string | null;
    } | null = Array.isArray(accountRaw) ? accountRaw[0] : (accountRaw as any);

    if (!account?.tiktok_access_token) {
      return NextResponse.json(
        { error: 'Account missing TikTok access token' },
        { status: 400 }
      );
    }

    const metrics = (content.engagement_metrics as Record<string, any>) ?? {};
    const tiktok_video_id = metrics.tiktok_video_id as string | undefined;

    if (!tiktok_video_id) {
      return NextResponse.json(
        {
          error: 'Content missing tiktok_video_id',
          message: 'Video ID must be stored in engagement_metrics after publishing'
        },
        { status: 400 }
      );
    }

    // Fetch video analytics from TikTok API
    const analyticsRes = await fetch(
      `https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.tiktok_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            video_ids: [tiktok_video_id],
          },
        }),
      }
    );

    if (!analyticsRes.ok) {
      const errText = await analyticsRes.text();
      console.error('TikTok analytics error:', errText);
      return NextResponse.json(
        { error: 'Failed to fetch TikTok analytics', details: errText },
        { status: analyticsRes.status }
      );
    }

    const analyticsData = await analyticsRes.json() as {
      data?: {
        videos?: Array<{
          id: string;
          view_count: number;
          like_count: number;
          comment_count: number;
          share_count: number;
        }>;
      };
      error?: {
        code: string;
        message: string;
      };
    };

    if (analyticsData.error?.code !== 'ok' || !analyticsData.data?.videos?.[0]) {
      return NextResponse.json(
        { error: analyticsData.error?.message ?? 'No analytics data available' },
        { status: 404 }
      );
    }

    const videoStats = analyticsData.data.videos[0];

    // Update content with fresh metrics
    const updatedMetrics = {
      ...metrics,
      views: videoStats.view_count,
      likes: videoStats.like_count,
      comments: videoStats.comment_count,
      shares: videoStats.share_count,
      last_synced_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('content')
      .update({ engagement_metrics: updatedMetrics })
      .eq('id', contentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      video_id: tiktok_video_id,
      metrics: {
        views: videoStats.view_count,
        likes: videoStats.like_count,
        comments: videoStats.comment_count,
        shares: videoStats.share_count,
      },
      last_synced: new Date().toISOString(),
    });
  } catch (err) {
    console.error('sync metrics error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
