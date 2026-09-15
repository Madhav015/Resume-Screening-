import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { getRazorpayClient } from '@/lib/razorpay/client';

export const runtime = 'nodejs';

// Admin-only, cancels immediately (not at cycle end) — simplest correct
// behavior for a v1; "let them keep access until the period they already
// paid for ends" is a reasonable follow-up but needs its own status
// ('cancel_at_period_end') to do right, rather than overloading 'cancelled'.
export async function POST() {
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

  const admin = createAdminSupabase();
  const { data: agency } = await admin.from('agencies').select('razorpay_subscription_id').eq('id', profile.agency_id).single();
  if (!agency?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No subscription to cancel.' }, { status: 400 });
  }

  const razorpay = getRazorpayClient();
  await razorpay.subscriptions.cancel(agency.razorpay_subscription_id, false);

  // Optimistic update for instant UI feedback; the subscription.cancelled
  // webhook will also fire and confirm the same state.
  await admin.from('agencies').update({ subscription_status: 'cancelled' }).eq('id', profile.agency_id);

  return NextResponse.json({ ok: true });
}
