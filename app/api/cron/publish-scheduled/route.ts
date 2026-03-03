import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publishToPlatform, getAccessToken, type PlatformPublishParams } from '@/lib/platforms';

/**
 * Cron endpoint: publishes all content whose scheduled_at has passed.
 *
 * Call this endpoint every minute via Vercel Cron, Supabase pg_cron,
 * or any external scheduler with:
 *   GET /api/cron/publish-scheduled
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Set CRON_SECRET in your .env.local to protect this endpoint.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds (Vercel Pro)

export async function GET(req: NextRequest) {
  // ── Auth: verify cron secret ───────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Use service-role key so we can act on all users' content
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const now = new Date().toISOString();

  // ── Fetch due items ────────────────────────────────────────────────────────
  const { data: dueItems, error: fetchError } = await supabase
    .from('content')
    .select(`
      id, title, script, video_url, status, engagement_metrics, scheduled_at, schedule_status,
      accounts (
        id, platform, platform_username,
        tiktok_access_token, tiktok_open_id,
        platform_access_token, platform_user_id, platform_page_id, platform_metadata
      )
    `)
    .eq('schedule_status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (fetchError) {
    console.error('cron: fetch error', fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueItems || dueItems.length === 0) {
    return NextResponse.json({ published: 0, message: 'No items due' });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const item of dueItems) {
    type AccountRow = {
      id: string;
      platform: string;
      platform_username: string;
      tiktok_access_token: string | null;
      tiktok_open_id: string | null;
      platform_access_token: string | null;
      platform_user_id: string | null;
      platform_page_id: string | null;
      platform_metadata: Record<string, string> | null;
    };

    const accountRaw = item.accounts as unknown;
    const account: AccountRow | null = Array.isArray(accountRaw)
      ? (accountRaw[0] ?? null)
      : (accountRaw as AccountRow | null);

    // Mark as publishing
    await supabase
      .from('content')
      .update({ schedule_status: 'publishing' })
      .eq('id', item.id);

    // ── Pre-flight checks ────────────────────────────────────────────────────
    const accessToken = account ? getAccessToken(account) : null;
    if (!account || !accessToken) {
      await markFailed(supabase, item.id, `No ${account?.platform ?? 'platform'} token`);
      results.push({ id: item.id, ok: false, error: `No ${account?.platform ?? 'platform'} token` });
      continue;
    }

    if (!item.video_url) {
      await markFailed(supabase, item.id, 'No video attached');
      results.push({ id: item.id, ok: false, error: 'No video attached' });
      continue;
    }

    // ── Get signed URL ───────────────────────────────────────────────────────
    const { data: signed, error: signError } = await supabase.storage
      .from('videos')
      .createSignedUrl(item.video_url, 300);

    if (signError || !signed?.signedUrl) {
      await markFailed(supabase, item.id, 'Could not sign video URL');
      results.push({ id: item.id, ok: false, error: 'Could not sign video URL' });
      continue;
    }

    // ── Publish to platform ──────────────────────────────────────────────────
    const metrics = item.engagement_metrics as { caption?: string } | null;
    const caption = metrics?.caption ?? item.title;
    const metadata = account.platform_metadata ?? {};

    const publishParams: PlatformPublishParams = {
      accessToken,
      videoUrl: signed.signedUrl,
      title: item.title,
      caption,
      platformUserId: account.platform_user_id ?? account.tiktok_open_id ?? undefined,
      pageId: account.platform_page_id ?? undefined,
      pageAccessToken: metadata.page_access_token ?? undefined,
    };

    try {
      const result = await publishToPlatform(
        account.platform as Parameters<typeof publishToPlatform>[0],
        publishParams
      );

      if (!result.success) {
        await markFailed(supabase, item.id, result.error ?? `${account.platform} publish failed`);
        results.push({ id: item.id, ok: false, error: result.error });
        continue;
      }

      // ── Mark as published ────────────────────────────────────────────────────
      await supabase
        .from('content')
        .update({
          status: 'published',
          schedule_status: 'published',
          published_at: new Date().toISOString(),
          engagement_metrics: {
            ...(metrics ?? {}),
            [`${account.platform}_publish_id`]: result.publishId,
          },
        })
        .eq('id', item.id);

      results.push({ id: item.id, ok: true });

      // ── Create notification ──────────────────────────────────────────────────
      const { data: acctData } = await supabase
        .from('accounts')
        .select('user_id')
        .eq('id', account.id)
        .single();

      if (acctData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: acctData.user_id,
          type: 'content_published',
          title: `Auto-published: ${item.title}`,
          message: `Scheduled post "${item.title}" was published to ${account.platform_username} on ${account.platform}`,
          read: false,
          action_url: '/content',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await markFailed(supabase, item.id, msg);
      results.push({ id: item.id, ok: false, error: msg });
    }
  }

  const published = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({ published, failed, results });
}

async function markFailed(supabase: SupabaseClient, id: string, reason: string) {
  await supabase
    .from('content')
    .update({ schedule_status: 'failed' })
    .eq('id', id);

  console.error(`cron: publish failed for ${id}: ${reason}`);
}
