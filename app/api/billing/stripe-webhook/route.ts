import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/billing/stripe-webhook
 * Handles Stripe webhooks for payment_intent.succeeded and customer.subscription.updated
 *
 * Set this URL as your Stripe webhook endpoint:
 * https://dashboard.stripe.com/webhooks
 */

export async function POST(req: NextRequest) {
  try {
    // In production, verify the Stripe signature:
    // const sig = req.headers.get('stripe-signature');
    // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    const body = await req.json();
    const event = body as {
      type: string;
      data: {
        object: {
          id: string;
          metadata?: Record<string, string>;
          status?: string;
        };
      };
    };

    // For now, just acknowledge the webhook
    if (!['payment_intent.succeeded', 'customer.subscription.updated', 'customer.subscription.created'].includes(event.type)) {
      return NextResponse.json({ received: true });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const metadata = event.data.object.metadata ?? {};
    const userId = metadata.user_id;

    if (!userId) {
      console.log('webhook: no user_id in metadata');
      return NextResponse.json({ received: true });
    }

    // Determine tier based on Stripe price or metadata
    const tier = metadata.tier ?? 'pro';

    // Update user tier in Supabase
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { tier, stripe_customer_id: event.data.object.id },
    });

    if (error) {
      console.error('webhook: failed to update user:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: `upgraded_to_${tier}`,
      resource_type: 'billing',
      details: {
        stripe_event_id: event.data.object.id,
        stripe_event_type: event.type,
      },
    }).catch(() => {
      // Ignore audit log errors
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('stripe webhook error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
