import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── GET  /api/teams/[id]/members ─────────────────────────────── */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [membersRes, invitesRes] = await Promise.all([
    supabase.from('team_members').select('*').eq('team_id', id),
    supabase.from('team_invites').select('*').eq('team_id', id).eq('status', 'pending'),
  ]);

  return NextResponse.json({
    members: membersRes.data ?? [],
    invites: invitesRes.data ?? [],
  });
}

/* ── POST /api/teams/[id]/members — invite a user ────────────── */

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, role } = await req.json();
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

    // Check team ownership
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!team) return NextResponse.json({ error: 'Team not found or not authorized' }, { status: 403 });

    const { data: invite, error } = await supabase
      .from('team_invites')
      .insert({
        team_id: id,
        invited_by: user.id,
        email,
        role: role ?? 'editor',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(invite);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* ── DELETE /api/teams/[id]/members — remove member or cancel invite ── */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memberId = req.nextUrl.searchParams.get('member_id');
  const inviteId = req.nextUrl.searchParams.get('invite_id');

  if (memberId) {
    await supabase.from('team_members').delete().eq('id', memberId).eq('team_id', id);
  }
  if (inviteId) {
    await supabase.from('team_invites').delete().eq('id', inviteId).eq('team_id', id);
  }

  return NextResponse.json({ ok: true });
}
