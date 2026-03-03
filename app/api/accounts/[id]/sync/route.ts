import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncPlatformProfile, getAccessToken, type PlatformKey } from '@/lib/platforms';

/**
 * POST /api/accounts/[id]/sync
 * Multi-platform sync — fetches latest profile data from the platform API.
 * For TikTok accounts, delegates to the existing /api/auth/tiktok/sync endpoint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: account, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const platform = account.platform as PlatformKey;

    // TikTok: delegate to existing sync endpoint
    if (platform === 'tiktok') {
      if (!account.tiktok_access_token) {
        return NextResponse.json({ error: 'No access token — reconnect TikTok account' }, { status: 400 });
      }

      const profileRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count',
        { headers: { Authorization: `Bearer ${account.tiktok_access_token}` } }
      );
      const profileData = await profileRes.json();
      if (profileData.error?.code !== 'ok' || !profileData.data?.user) {
        return NextResponse.json({ error: profileData.error?.message ?? 'TikTok API error' }, { status: 500 });
      }

      const tk = profileData.data.user;
      await supabase.from('accounts').update({
        followers_count: tk.follower_count ?? account.followers_count,
        avatar_url: tk.avatar_url ?? account.avatar_url,
        display_name: tk.display_name ?? account.display_name,
      }).eq('id', id);

      return NextResponse.json({ success: true, followers_count: tk.follower_count });
    }

    // Other platforms: use generic sync
    const accessToken = getAccessToken(account);
    if (!accessToken) {
      return NextResponse.json(
        { error: `No access token for ${platform} — connect the account via OAuth first` },
        { status: 400 }
      );
    }

    const updates = await syncPlatformProfile(platform, accessToken);
    if (!updates) {
      return NextResponse.json({ error: `Failed to sync ${platform} profile` }, { status: 500 });
    }

    await supabase.from('accounts').update(updates).eq('id', id);

    return NextResponse.json({
      success: true,
      platform,
      followers_count: updates.followers_count,
    });
  } catch (err) {
    console.error('sync error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
