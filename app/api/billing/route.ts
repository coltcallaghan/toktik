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

// Tier definitions
const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      ai_generation: 20,
      video_upload: 5,
      tts_generation: 10,
      accounts: 2,
      team_members: 1,
    },
  },
  pro: {
    name: 'Pro',
    price: 29,
    limits: {
      ai_generation: 200,
      video_upload: 50,
      tts_generation: 100,
      accounts: 10,
      team_members: 5,
    },
  },
  business: {
    name: 'Business',
    price: 99,
    limits: {
      ai_generation: 1000,
      video_upload: 250,
      tts_generation: 500,
      accounts: 50,
      team_members: 25,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    limits: {
      ai_generation: -1, // unlimited
      video_upload: -1,
      tts_generation: -1,
      accounts: -1,
      team_members: -1,
    },
  },
};

// GET – usage summary for current billing period
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'current'; // current | all

  // Current billing period = start of current month
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Fetch usage records for current period
  let query = supabase
    .from('usage_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (period === 'current') {
    query = query.gte('created_at', periodStart);
  }

  const { data: records, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by action
  const usage: Record<string, number> = {};
  (records || []).forEach((r: { action: string; credits_used: number }) => {
    usage[r.action] = (usage[r.action] || 0) + r.credits_used;
  });

  // Get user tier from metadata or default to free
  const tier = (user.user_metadata?.tier as string) || 'free';
  const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.free;

  // Daily breakdown for chart (last 30 days)
  const dailyUsage: Record<string, number> = {};
  (records || []).forEach((r: { created_at: string; credits_used: number }) => {
    const day = new Date(r.created_at).toISOString().split('T')[0];
    dailyUsage[day] = (dailyUsage[day] || 0) + r.credits_used;
  });

  // Fill in missing days
  const days: { date: string; credits: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({ date: key, credits: dailyUsage[key] || 0 });
  }

  return NextResponse.json({
    tier,
    tierConfig,
    tiers: TIERS,
    usage,
    dailyUsage: days,
    periodStart,
    totalCredits: Object.values(usage).reduce((a, b) => a + b, 0),
  });
}

// POST – record usage (called internally by other APIs)
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, credits_used, metadata } = body;

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  // Check tier limits
  const tier = (user.user_metadata?.tier as string) || 'free';
  const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.free;
  const limit = tierConfig.limits[action as keyof typeof tierConfig.limits];

  if (limit !== undefined && limit !== -1) {
    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await supabase
      .from('usage_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', action)
      .gte('created_at', periodStart);

    if ((count || 0) >= limit) {
      return NextResponse.json({
        error: 'Usage limit reached',
        limit,
        current: count,
        tier,
        upgrade_needed: true,
      }, { status: 429 });
    }
  }

  const { data, error } = await supabase.from('usage_records').insert({
    user_id: user.id,
    action,
    credits_used: credits_used || 1,
    metadata: metadata || {},
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ record: data });
}

// PATCH – update user tier
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { tier } = body;

  if (!tier || !TIERS[tier as keyof typeof TIERS]) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  // In production, this would verify Stripe payment first
  const { error } = await supabase.auth.updateUser({
    data: { tier },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tier, message: `Upgraded to ${TIERS[tier as keyof typeof TIERS].name}` });
}
