import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const { account_id } = await req.json();
    if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

    // Fetch the account and verify ownership
    const { data: account, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.tiktok_access_token) {
      return NextResponse.json({ error: 'No access token — reconnect account' }, { status: 400 });
    }

    // Fetch fresh profile from TikTok
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
    }).eq('id', account_id);

    return NextResponse.json({ success: true, followers_count: tk.follower_count });
  } catch (err) {
    console.error('sync error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
