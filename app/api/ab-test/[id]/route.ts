import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ------------------------------------------------------------------ */
/*  GET /api/ab-test/[id] — get test details with variant performance  */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fetch test
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Fetch variants
    const { data: variants, error: variantsError } = await supabase
      .from('content')
      .select('*, accounts(platform_username, avatar_url)')
      .eq('ab_test_id', id)
      .order('variant_label', { ascending: true });

    if (variantsError) {
      return NextResponse.json({ error: variantsError.message }, { status: 500 });
    }

    return NextResponse.json({ test, variants: variants ?? [] });
  } catch (err) {
    console.error('ab-test detail error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/ab-test/[id] — update test (pick winner, complete, etc) */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json();
    const { status, winner_variant_id } = body as {
      status?: string;
      winner_variant_id?: string;
    };

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (winner_variant_id) updates.winner_variant_id = winner_variant_id;

    const { error } = await supabase
      .from('ab_tests')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('ab-test update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/ab-test/[id] — delete test (keeps content as drafts)   */
/* ------------------------------------------------------------------ */

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Unlink content variants (don't delete the content)
    await supabase
      .from('content')
      .update({ ab_test_id: null, variant_label: null })
      .eq('ab_test_id', id);

    const { error } = await supabase
      .from('ab_tests')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('ab-test delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
