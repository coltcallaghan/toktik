import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchPlatformAnalytics, type PlatformKey } from '@/lib/platform-analytics';

/**
 * POST /api/content/sync-metrics-universal
 *
 * Universal endpoint to sync metrics for published content on ANY platform
 * (TikTok, YouTube, Instagram, Facebook, Twitter, LinkedIn)
 *
 * Requires:
 * - content.engagement_metrics.platform_post_id (where platform stores video/post ID)
 */

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content_id } = await req.json() as { content_id: string };
    if (!content_id) {
      return NextResponse.json({ error: 'content_id required' }, { status: 400 });
    }

    // Fetch content with account info
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select(`
        id, title, status, engagement_metrics,
        accounts (
          id, platform, platform_access_token, platform_refresh_token, platform_metadata
        )
      `)
      .eq('id', content_id)
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
      platform: string;
      platform_access_token: string | null;
      platform_refresh_token: string | null;
      platform_metadata?: Record<string, any>;
    } | null = Array.isArray(accountRaw) ? accountRaw[0] : (accountRaw as any);

    if (!account?.platform_access_token) {
      return NextResponse.json(
        { error: 'Account missing platform access token' },
        { status: 400 }
      );
    }

    const metrics = (content.engagement_metrics as Record<string, any>) ?? {};
    const platformPostId = metrics.platform_post_id as string | undefined;

    if (!platformPostId) {
      return NextResponse.json(
        {
          error: 'Content missing platform_post_id',
          message: `Post ID must be stored in engagement_metrics after publishing. Expected field: "platform_post_id"`,
          hint: `For ${account.platform}: store the platform-specific post/video/media ID in engagement_metrics.platform_post_id`,
        },
        { status: 400 }
      );
    }

    // Fetch analytics from the appropriate platform
    const analytics = await fetchPlatformAnalytics(
      account.platform as PlatformKey,
      account.platform_access_token,
      platformPostId,
      account.platform_refresh_token
    );

    if (!analytics) {
      return NextResponse.json(
        { error: `Failed to fetch ${account.platform} analytics` },
        { status: 404 }
      );
    }

    // Update content with fresh metrics
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
      .eq('id', content_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      platform: account.platform,
      post_id: platformPostId,
      metrics: {
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
      },
      last_synced: new Date().toISOString(),
    });
  } catch (err) {
    console.error('sync metrics universal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
