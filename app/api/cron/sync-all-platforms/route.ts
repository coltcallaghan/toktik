import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPlatformAnalytics, type PlatformKey } from '@/lib/platform-analytics';

/**
 * GET /api/cron/sync-all-platforms
 *
 * Cron job: Syncs engagement metrics for ALL published content across ALL platforms
 * (TikTok, YouTube, Instagram, Facebook, Twitter, LinkedIn)
 *
 * Run hourly via Vercel Cron:
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * This automatically syncs views, likes, comments, shares for all published videos.
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
    // Fetch recently published content across all platforms
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: contentToSync, error: fetchError } = await supabase
      .from('content')
      .select(`
        id, title, status, engagement_metrics, published_at,
        accounts (
          id, platform, platform_username, platform_access_token, platform_refresh_token
        )
      `)
      .eq('status', 'published')
      .gte('published_at', thirtyDaysAgo)
      .order('published_at', { ascending: false })
      .limit(30); // Process up to 30 per run

    if (fetchError) {
      console.error('cron sync-all-platforms: fetch error', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!contentToSync || contentToSync.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No content to sync' });
    }

    const results: {
      id: string;
      platform: string;
      status: 'success' | 'skip' | 'error';
      message?: string;
      views?: number;
    }[] = [];

    for (const content of contentToSync) {
      const accountRaw = content.accounts as unknown;
      const account: any = Array.isArray(accountRaw) ? accountRaw[0] : accountRaw;

      // Skip if no platform or access token
      if (!account?.platform || !account?.platform_access_token) {
        results.push({
          id: content.id,
          platform: account?.platform ?? 'unknown',
          status: 'skip',
          message: 'No access token',
        });
        continue;
      }

      const metrics = (content.engagement_metrics as Record<string, any>) ?? {};
      const platformPostId = metrics.platform_post_id as string | undefined;

      if (!platformPostId) {
        results.push({
          id: content.id,
          platform: account.platform,
          status: 'skip',
          message: 'No platform_post_id',
        });
        continue;
      }

      // Skip if synced recently (< 2 hours)
      const lastSyncedAt = metrics.last_synced_at as string | undefined;
      if (lastSyncedAt) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        if (new Date(lastSyncedAt) > twoHoursAgo) {
          results.push({
            id: content.id,
            platform: account.platform,
            status: 'skip',
            message: 'Recently synced',
          });
          continue;
        }
      }

      try {
        // Fetch analytics from the appropriate platform
        const analytics = await fetchPlatformAnalytics(
          account.platform as PlatformKey,
          account.platform_access_token,
          platformPostId,
          account.platform_refresh_token
        );

        if (!analytics) {
          results.push({
            id: content.id,
            platform: account.platform,
            status: 'skip',
            message: 'No analytics available',
          });
          continue;
        }

        // Update metrics
        const updatedMetrics = {
          ...metrics,
          views: analytics.views,
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          last_synced_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('content')
          .update({ engagement_metrics: updatedMetrics })
          .eq('id', content.id);

        if (updateError) {
          console.error(`cron sync-all-platforms: update error for ${content.id}:`, updateError.message);
          results.push({
            id: content.id,
            platform: account.platform,
            status: 'error',
            message: updateError.message,
          });
        } else {
          results.push({
            id: content.id,
            platform: account.platform,
            status: 'success',
            views: analytics.views,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`cron sync-all-platforms: error for ${content.id}:`, msg);
        results.push({
          id: content.id,
          platform: account.platform,
          status: 'error',
          message: msg,
        });
      }
    }

    const succeeded = results.filter((r) => r.status === 'success').length;
    const skipped = results.filter((r) => r.status === 'skip').length;
    const failed = results.filter((r) => r.status === 'error').length;

    // Group by platform for summary
    const byPlatform: Record<string, { success: number; skip: number; error: number }> = {};
    for (const result of results) {
      if (!byPlatform[result.platform]) {
        byPlatform[result.platform] = { success: 0, skip: 0, error: 0 };
      }
      byPlatform[result.platform][result.status]++;
    }

    return NextResponse.json({
      total: results.length,
      synced: succeeded,
      skipped,
      failed,
      by_platform: byPlatform,
      results,
    });
  } catch (err) {
    console.error('cron sync-all-platforms: unhandled error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
