import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function createSupabaseServer(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

// GET – list agency clients + overview stats
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('agency_clients')
    .select('*')
    .eq('agency_user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data: clients, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get account counts per client
  const clientIds = (clients || []).map(c => c.id);
  let accountsByClient: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, agency_client_id')
      .in('agency_client_id', clientIds);

    (accounts || []).forEach((a: { agency_client_id: string }) => {
      accountsByClient[a.agency_client_id] = (accountsByClient[a.agency_client_id] || 0) + 1;
    });
  }

  // Enrich clients with counts
  const enriched = (clients || []).map(c => ({
    ...c,
    account_count: accountsByClient[c.id] || 0,
  }));

  return NextResponse.json({ clients: enriched });
}

// POST – create a new agency client
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_name, client_email, notes } = body;

  if (!client_name) {
    return NextResponse.json({ error: 'client_name is required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('agency_clients').insert({
    agency_user_id: user.id,
    client_name,
    client_email: client_email || null,
    notes: notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ client: data });
}

// PATCH – update client details or status
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('agency_clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('agency_user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ client: data });
}

// DELETE – remove a client
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id param required' }, { status: 400 });

  // Unlink accounts first
  await supabase
    .from('accounts')
    .update({ agency_client_id: null })
    .eq('agency_client_id', id);

  const { error } = await supabase
    .from('agency_clients')
    .delete()
    .eq('id', id)
    .eq('agency_user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
