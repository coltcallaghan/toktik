import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const ENC_KEY = process.env.CREDENTIALS_ENC_KEY ?? 'fallback-dev-key-32-chars-exactly!';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(ENC_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(data: string): string {
  const [ivHex, tagHex, encryptedHex] = data.split(':');
  const key = crypto.scryptSync(ENC_KEY, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

const VALID_PROVIDERS = ['runway', 'heygen', 'elevenlabs', 'anthropic'] as const;
type Provider = typeof VALID_PROVIDERS[number];

async function getSupabaseUser(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/* ── GET /api/user-api-keys ─────────────────────────────────────────
   Returns which providers have keys saved (never returns the key itself) */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const { supabase, user } = await getSupabaseUser(cookieStore);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('user_api_keys')
      .select('provider, updated_at')
      .eq('user_id', user.id);

    const configured = (data ?? []).reduce<Record<string, string>>((acc, row) => {
      acc[row.provider] = row.updated_at;
      return acc;
    }, {});

    return NextResponse.json({ configured });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

/* ── POST /api/user-api-keys ────────────────────────────────────────
   Save or update a provider API key (encrypted) */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const { supabase, user } = await getSupabaseUser(cookieStore);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider, key } = await req.json() as { provider: Provider; key: string };

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }
    if (!key?.trim()) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const encrypted = encrypt(key.trim());

    await supabase
      .from('user_api_keys')
      .upsert({ user_id: user.id, provider, encrypted_key: encrypted }, { onConflict: 'user_id,provider' });

    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

/* ── DELETE /api/user-api-keys ──────────────────────────────────────
   Remove a saved key */
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const { supabase, user } = await getSupabaseUser(cookieStore);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider } = await req.json() as { provider: Provider };

    await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

/* ── Helper: fetch a decrypted key for a user (used by generation routes) */
export async function getUserApiKey(userId: string, provider: Provider): Promise<string | null> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (!data?.encrypted_key) return null;

  try {
    return decrypt(data.encrypted_key);
  } catch {
    return null;
  }
}
