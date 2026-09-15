import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { getRazorpayClient } from '@/lib/razorpay/client';
import { tierByKey } from '@/lib/billing/tiers';
import type { Agency } from '@/lib/types';

export const runtime = 'nodejs';

// Creates (or reuses) a Razorpay subscription for the caller's agency on a
// chosen tier (Starter/Growth/Pro — see src/lib/billing/tiers.ts) and hands
// back what BillingPanel.tsx needs to open Checkout. Admin-only — billing is
// an agency-level decision, not a per-recruiter one.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tier = tierByKey(body?.tier);
  if (!tier) return NextResponse.json({ error: 'Invalid or missing tier.' }, { status: 400 });

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, agency_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only an agency admin can manage billing.' }, { status: 403 });
  }

  const planId = process.env[tier.envVar];
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!planId || !keyId) {
    return NextResponse.json(
      { error: `Billing isn't configured for the ${tier.name} tier yet (missing ${tier.envVar} / RAZORPAY_KEY_ID).` },
      { status: 500 }
    );
  }

  // Admin client: this write needs to happen regardless of the RLS policy
  // shape, and matches the pattern used for candidate_scores elsewhere.
  const admin = createAdminSupabase();
  const { data: agency, error: agencyError } = await admin
    .from('agencies')
    .select('*')
    .eq('id', profile.agency_id)
    .single<Agency>();
  if (agencyError || !agency) return NextResponse.json({ error: 'Agency not found.' }, { status: 404 });

  // Reuse an in-flight or already-active subscription for the SAME tier
  // instead of creating a duplicate every time someone reopens the billing
  // page. A subscription already in flight for a DIFFERENT tier must be
  // resolved (completed or cancelled) first — Razorpay subscriptions don't
  // support changing the plan mid-subscription in this app yet, so "switch
  // tiers" means cancel, then subscribe to the new one.
  const reusableStatuses = ['created', 'authenticated', 'active', 'pending'];
  if (agency.razorpay_subscription_id && reusableStatuses.includes(agency.subscription_status)) {
    if (agency.subscription_tier === tier.key) {
      return NextResponse.json({ subscriptionId: agency.razorpay_subscription_id, keyId });
    }
    return NextResponse.json(
      {
        error: `You already have a subscription in progress on the ${
          agency.subscription_tier ?? 'current'
        } tier. Cancel it first to switch to ${tier.name}.`,
      },
      { status: 409 }
    );
  }

  const razorpay = getRazorpayClient();
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    // Razorpay subscriptions require a bounded number of billing cycles —
    // there's no literal "forever" option. 120 monthly cycles = 10 years,
    // which is effectively open-ended for this product; renewing it before
    // then (or switching to a longer total_count) is a later problem, not
    // something a recruiting agency needs to think about at signup.
    total_count: 120,
    customer_notify: true,
    notes: { agency_id: agency.id, agency_name: agency.name, tier: tier.key },
  });

  await admin
    .from('agencies')
    .update({
      razorpay_subscription_id: subscription.id,
      subscription_plan_id: planId,
      subscription_tier: tier.key,
      subscription_status: subscription.status ?? 'created',
    })
    .eq('id', agency.id);

  return NextResponse.json({ subscriptionId: subscription.id, keyId });
}
