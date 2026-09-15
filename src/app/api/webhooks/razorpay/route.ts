import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/razorpay/verify';
import { tierByPlanId } from '@/lib/billing/tiers';

export const runtime = 'nodejs';

// Razorpay calls this directly — there is no signed-in user, so this route
// is deliberately outside middleware.ts's matcher (see that file) and does
// its own authentication via the webhook signature instead of a session.
// This is the source of truth for subscription state: unlike
// /api/billing/verify (instant UI feedback right after Checkout), this
// fires for every later lifecycle event too — renewals, failed charges,
// cancellations — regardless of whether the agency's tab is even open.
//
// Configure in the Razorpay Dashboard under Settings > Webhooks:
//   URL: https://<your-domain>/api/webhooks/razorpay
//   Secret: a value YOU generate, saved as RAZORPAY_WEBHOOK_SECRET below —
//     this is NOT the same as RAZORPAY_KEY_SECRET, don't reuse it.
//   Active events: subscription.authenticated, subscription.activated,
//     subscription.charged, subscription.completed, subscription.pending,
//     subscription.halted, subscription.cancelled, subscription.paused,
//     subscription.resumed
//
// Maps each event to the resulting agencies.subscription_status. Payment
// retries within a billing cycle are Razorpay's problem, not ours — we only
// care about the subscription-level state transitions.
const STATUS_BY_EVENT: Record<string, string> = {
  'subscription.authenticated': 'authenticated',
  'subscription.activated': 'active',
  'subscription.charged': 'active',
  'subscription.completed': 'completed',
  'subscription.pending': 'pending',
  'subscription.halted': 'halted',
  'subscription.cancelled': 'cancelled',
  'subscription.paused': 'paused',
  'subscription.resumed': 'active',
};

export async function POST(req: NextRequest) {
  // Must read the UNPARSED body — the signature is computed over the exact
  // raw bytes Razorpay sent. Parsing to JSON first (even just to peek) and
  // re-deriving the string later will not reproduce the same signature.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const subscriptionEntity = event?.payload?.subscription?.entity;
  const subscriptionId: string | undefined = subscriptionEntity?.id;

  // Best-effort resolve which agency this event belongs to, purely so the
  // audit row below is useful for debugging — the actual status update
  // further down looks the agency up itself and doesn't depend on this.
  let agencyId: string | null = null;
  if (subscriptionId) {
    const { data: agency } = await admin
      .from('agencies')
      .select('id')
      .eq('razorpay_subscription_id', subscriptionId)
      .maybeSingle();
    agencyId = agency?.id ?? null;
  }

  // Log every event regardless of whether we act on it below — cheap, and
  // invaluable the first time a webhook does something unexpected.
  await admin.from('billing_events').insert({
    event: event?.event ?? 'unknown',
    agency_id: agencyId,
    payload: event,
  });

  if (!subscriptionId) return NextResponse.json({ received: true });

  const newStatus = STATUS_BY_EVENT[event.event];
  if (newStatus) {
    const update: Record<string, unknown> = { subscription_status: newStatus };
    // current_end is a Unix timestamp (seconds) marking the end of the
    // billing cycle that was just paid for — i.e. "paid through" date.
    if (typeof subscriptionEntity.current_end === 'number') {
      update.current_period_end = new Date(subscriptionEntity.current_end * 1000).toISOString();
    }
    // Defensive self-heal: if the subscription's plan_id maps to a known
    // tier, keep subscription_tier in sync with it. Normally this is already
    // set at /api/billing/subscribe time, but this catches drift if a
    // subscription's plan is ever changed directly in the Razorpay
    // Dashboard rather than through this app.
    const planId: string | undefined = subscriptionEntity.plan_id;
    const tier = tierByPlanId(planId);
    if (tier) update.subscription_tier = tier.key;
    await admin.from('agencies').update(update).eq('razorpay_subscription_id', subscriptionId);
  }

  return NextResponse.json({ received: true });
}
