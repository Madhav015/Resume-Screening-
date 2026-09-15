import { createServerSupabase } from '@/lib/supabase/server';
import { getRazorpayClient } from '@/lib/razorpay/client';
import { TIERS } from '@/lib/billing/tiers';
import type { Agency } from '@/lib/types';
import BillingPanel, { type PlanInfo } from '@/components/BillingPanel';

export default async function BillingPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role, agency_id').eq('id', user!.id).single();
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile!.agency_id)
    .single<Agency>();

  // Fetch each tier's LIVE price from Razorpay (rather than hardcoding
  // numbers here) so this page can never show a stale or wrong price — a
  // tier whose plan id isn't configured yet (or fails to fetch) just shows
  // as "not configured" instead of lying about a number.
  const hasKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const razorpay = hasKeys ? getRazorpayClient() : null;

  const plans: Partial<Record<string, PlanInfo>> = {};
  if (razorpay) {
    await Promise.all(
      TIERS.map(async (tier) => {
        const planId = process.env[tier.envVar];
        if (!planId) return;
        try {
          const p = await razorpay.plans.fetch(planId);
          plans[tier.key] = {
            name: p.item.name,
            amount: Number(p.item.amount),
            currency: p.item.currency,
            period: p.period,
            interval: p.interval,
          };
        } catch {
          // Leave this tier out of `plans` — BillingPanel treats a missing
          // entry as "not configured" for that tier.
        }
      })
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Billing</h1>
      <p className="mb-6 text-sm text-slate-500">Your agency's plan and payment status.</p>
      <BillingPanel agency={agency as Agency} isAdmin={profile!.role === 'admin'} plans={plans} />
    </div>
  );
}
