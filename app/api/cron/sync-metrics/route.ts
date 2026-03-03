import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/sync-metrics
 *
 * Cron job: Syncs engagement metrics for all published content from TikTok.
 * Run every hour via Vercel Cron or external scheduler:
 *   GET https://yourdomain.com/api/cron/sync-metrics
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * This automatically updates views, likes, comments, shares for all published videos.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Auth: verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Fetch recently published content that needs syncing
    // (published in last 30 days, not synced in last 6 hours)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: contentToSync, error: fetchError } = await supabase
      .from('content')
      .select(`
        id, title, status, engagement_metrics,
        accounts (
          id, platform_username, tiktok_access_token, tiktok_open_id
        )
      `)
      .eq('status', 'published')
      .gte('published_at', thirtyDaysAgo)
      .order('published_at', { ascending: false })
      .limit(20); // Process up to 20 per run to avoid timeout

    if (fetchError) {
      console.error('cron sync-metrics: fetch error', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!contentToSync || contentToSync.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No content to sync' });
    }

    const results: {
      id: string;
      status: 'success' | 'skip' | 'error';
      message?: string;
      views?: number;
    }[] = [];

    for (const content of contentToSync) {
      const accountRaw = content.accounts as unknown;
      const account: any = Array.isArray(accountRaw) ? accountRaw[0] : accountRaw;

      // Skip if no TikTok token or video ID
      if (!account?.tiktok_access_token) {
        results.push({ id: content.id, status: 'skip', message: 'No TikTok token' });
        continue;
      }

      const metrics = (content.engagement_metrics as Record<string, any>) ?? {};
      const tiktok_video_id = metrics.tiktok_video_id as string | undefined;
      const lastSyncedAt = metrics.last_synced_at as string | undefined;

      if (!tiktok_video_id) {
        results.push({ id: content.id, status: 'skip', message: 'No video ID' });
        continue;
      }

      // Skip if synced recently
      if (lastSyncedAt && new Date(lastSyncedAt) > new Date(sixHoursAgo)) {
        results.push({ id: content.id, status: 'skip', message: 'Recently synced' });
        continue;
      }

      try {
        // Fetch from TikTok API
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
          console.error(`cron sync-metrics: TikTok error for ${content.id}:`, errText);
          results.push({ id: content.id, status: 'error', message: 'TikTok API error' });
          continue;
        }

        const analyticsData = await analyticsRes.json() as any;

        if (analyticsData.error?.code !== 'ok' || !analyticsData.data?.videos?.[0]) {
          results.push({ id: content.id, status: 'skip', message: 'No analytics' });
          continue;
        }

        const videoStats = analyticsData.data.videos[0];

        // Update metrics
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
          .eq('id', content.id);

        if (updateError) {
          console.error(`cron sync-metrics: update error for ${content.id}:`, updateError.message);
          results.push({ id: content.id, status: 'error', message: updateError.message });
        } else {
          results.push({
            id: content.id,
            status: 'success',
            views: videoStats.view_count,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`cron sync-metrics: error for ${content.id}:`, msg);
        results.push({ id: content.id, status: 'error', message: msg });
      }
    }

    const succeeded = results.filter((r) => r.status === 'success').length;
    const skipped = results.filter((r) => r.status === 'skip').length;
    const failed = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      synced: succeeded,
      skipped,
      failed,
      results,
    });
  } catch (err) {
    console.error('cron sync-metrics: unhandled error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
