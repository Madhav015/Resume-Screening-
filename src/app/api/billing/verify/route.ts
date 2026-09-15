import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { verifyCheckoutSignature } from '@/lib/razorpay/verify';

export const runtime = 'nodejs';

// Called by BillingPanel.tsx's Checkout `handler` callback right after the
// customer authorizes payment, purely for instant UI feedback (so the page
// doesn't sit on "Subscribing…" waiting for a webhook that might take a few
// seconds). The webhook handler (src/app/api/webhooks/razorpay/route.ts) is
// the source of truth for subscription state going forward — if this route
// is never called (tab closed mid-checkout, etc.) the webhook still lands
// and the agency's status still gets updated correctly.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body ?? {};
  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing verification fields.' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

  const ok = verifyCheckoutSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature);
  if (!ok) return NextResponse.json({ error: 'Signature verification failed.' }, { status: 400 });

  const admin = createAdminSupabase();
  // The extra `.eq('razorpay_subscription_id', ...)` means this can only
  // ever update the caller's OWN agency's subscription row — a signed-in
  // user can't use this route to mark a different agency active even if
  // they somehow got hold of a valid signature for it.
  await admin
    .from('agencies')
    .update({ subscription_status: 'active' })
    .eq('id', profile.agency_id)
    .eq('razorpay_subscription_id', razorpay_subscription_id);

  return NextResponse.json({ ok: true });
}
