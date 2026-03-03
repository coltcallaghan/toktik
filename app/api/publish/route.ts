import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publishToPlatform, getAccessToken, type PlatformPublishParams } from '@/lib/platforms';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/publish
 * Body: { account_id, content_id } or { account_id, video_url, title, caption }
 *
 * Publishes content to the correct platform based on the account's platform field.
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

    const body = await req.json();
    const { account_id, content_id, video_url, title, caption } = body;

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    // Fetch account
    const { data: account, error: accountErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (accountErr || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const accessToken = getAccessToken(account);
    if (!accessToken) {
      return NextResponse.json(
        { error: `No access token for ${account.platform} — connect the account first` },
        { status: 400 }
      );
    }

    // Resolve content details
    let resolvedVideoUrl = video_url;
    let resolvedTitle = title ?? '';
    let resolvedCaption = caption ?? '';

    if (content_id) {
      const { data: content } = await supabase
        .from('content')
        .select('*')
        .eq('id', content_id)
        .single();

      if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });
      if (!content.video_url && !video_url) {
        return NextResponse.json({ error: 'No video attached to this content' }, { status: 400 });
      }

      resolvedTitle = resolvedTitle || content.title;
      resolvedCaption = resolvedCaption || (content.engagement_metrics as { caption?: string })?.caption || content.title;

      // Get signed URL from Supabase storage
      if (!resolvedVideoUrl && content.video_url) {
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: signed } = await serviceSupabase.storage
          .from('videos')
          .createSignedUrl(content.video_url, 300);
        resolvedVideoUrl = signed?.signedUrl;
      }
    }

    if (!resolvedVideoUrl) {
      return NextResponse.json({ error: 'No video URL provided' }, { status: 400 });
    }

    // Build publish params
    const metadata = (account.platform_metadata ?? {}) as Record<string, string>;
    const params: PlatformPublishParams = {
      accessToken,
      videoUrl: resolvedVideoUrl,
      title: resolvedTitle,
      caption: resolvedCaption,
      platformUserId: account.platform_user_id ?? account.tiktok_open_id ?? undefined,
      pageId: account.platform_page_id ?? undefined,
      pageAccessToken: metadata.page_access_token ?? undefined,
    };

    // Publish
    const result = await publishToPlatform(account.platform, params);

    // Update content status if content_id was provided
    if (content_id && result.success) {
      await supabase.from('content').update({
        status: 'published',
        published_at: new Date().toISOString(),
      }).eq('id', content_id);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Publish failed', platform: account.platform },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      platform: account.platform,
      publishId: result.publishId,
    });
  } catch (err) {
    console.error('publish error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
