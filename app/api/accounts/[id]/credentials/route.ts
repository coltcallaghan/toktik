import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// A server-side-only encryption passphrase.
// In production, replace with a dedicated secret stored in env (never exposed to client).
const ENC_KEY = process.env.CREDENTIALS_ENC_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

// GET — return decrypted credentials for the account
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // RLS ensures only the owner's row is returned; decrypt password via pgcrypto
    const { data, error } = await supabase.rpc('get_account_credentials', {
      p_account_id: id,
      p_enc_key: ENC_KEY,
    });

    if (error) {
      console.error('credentials GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? { email: null, password: null, phone: null });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

// PUT — save credentials (encrypts password and phone server-side)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { email, password, phone } = await req.json() as { email?: string; password?: string; phone?: string };

    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.rpc('set_account_credentials', {
      p_account_id: id,
      p_email: email ?? null,
      p_password: password ?? null,
      p_phone: phone ?? null,
      p_enc_key: ENC_KEY,
    });

    if (error) {
      console.error('credentials PUT error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
