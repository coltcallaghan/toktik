import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const TIER_MAP: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO || 'price_pro_monthly']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS || 'price_business_monthly']: 'business',
  [process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly']: 'enterprise',
};

/**
 * POST /api/billing/stripe-webhook
 * Handles Stripe webhooks for subscription lifecycle events
 * Configure in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 * Events: customer.subscription.created, updated, deleted, invoice.paid, invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceId ? TIER_MAP[priceId] : 'pro';
        const userId = subscription.metadata?.supabase_uid;

        if (userId) {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { tier, stripe_customer_id: subscription.customer },
          });
          console.log(`Tier updated: ${userId} → ${tier}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_uid;

        if (userId) {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { tier: 'free' },
          });
          console.log(`Subscription cancelled: ${userId} → free tier`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice paid:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.error('Invoice payment failed:', invoice.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 400 }
    );
  }
}
