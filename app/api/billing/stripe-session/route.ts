import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/billing/stripe-session
 * Creates a Stripe Checkout session for upgrading to a paid tier
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
    const { tier } = body as { tier: string };

    if (!tier || !['pro', 'business', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Price lookup
    const stripePrices: Record<string, string> = {
      pro: process.env.STRIPE_PRICE_PRO ?? 'price_pro_placeholder',
      business: process.env.STRIPE_PRICE_BUSINESS ?? 'price_business_placeholder',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? 'price_enterprise_placeholder',
    };

    // In a real implementation, use Stripe SDK:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({ ... });

    // For now, return a stub that shows what's needed
    return NextResponse.json({
      status: 'not_configured',
      message: 'Stripe integration requires STRIPE_SECRET_KEY and STRIPE_PRICE_* env vars',
      needed_env_vars: [
        'STRIPE_PUBLIC_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_PRICE_PRO',
        'STRIPE_PRICE_BUSINESS',
        'STRIPE_PRICE_ENTERPRISE',
      ],
      implementation_notes: [
        '1. Install stripe package: npm install stripe',
        '2. Create prices in Stripe dashboard',
        '3. Set env vars in .env.local',
        '4. Implement session creation with redirect to checkout',
        '5. Add webhook handler at /api/billing/stripe-webhook',
        '6. Update user tier in Supabase after payment success',
      ],
    });
  } catch (err) {
    console.error('stripe session error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
