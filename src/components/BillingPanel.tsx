'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Agency, SubscriptionStatus } from '@/lib/types';
import { TIERS, formatJobLimit, type TierKey } from '@/lib/billing/tiers';
import { IconAlertTriangle, IconCheck, IconCheckCircle, IconLoader, IconSparkles } from '@/components/ui/icons';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type PlanInfo = {
  name: string;
  amount: number; // in the currency's smallest unit (paise for INR)
  currency: string;
  period: string;
  interval: number;
};

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; tone: 'green' | 'amber' | 'red' | 'slate' }> = {
  none: { label: 'No active plan', tone: 'slate' },
  created: { label: 'Payment pending', tone: 'amber' },
  authenticated: { label: 'Authorizing', tone: 'amber' },
  active: { label: 'Active', tone: 'green' },
  pending: { label: 'Renewal retrying', tone: 'amber' },
  halted: { label: 'Payment failed', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
  completed: { label: 'Completed', tone: 'slate' },
  paused: { label: 'Paused', tone: 'amber' },
  expired: { label: 'Authorization expired', tone: 'red' },
};

const TONE_CLASSES = {
  green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

// Statuses where the agency has a subscription "occupying" a tier — either
// already paying for it or partway through checkout for it.
const OCCUPIED: SubscriptionStatus[] = ['created', 'authenticated', 'active', 'pending'];
const RESUMABLE_CHECKOUT: SubscriptionStatus[] = ['created', 'authenticated'];

export default function BillingPanel({
  agency,
  isAdmin,
  plans,
}: {
  agency: Agency;
  isAdmin: boolean;
  plans: Partial<Record<string, PlanInfo>>;
}) {
  const router = useRouter();
  const [busyTier, setBusyTier] = useState<TierKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const status = agency.subscription_status;
  const config = STATUS_CONFIG[status];
  const isOccupied = OCCUPIED.includes(status);
  const currentTier = agency.subscription_tier;

  const startCheckout = async (tierKey: TierKey) => {
    setError(null);
    setBusyTier(tierKey);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start checkout.');

      if (!scriptReady || !window.Razorpay) {
        throw new Error('Payment form is still loading — try again in a moment.');
      }

      const plan = plans[tierKey];
      const tierDef = TIERS.find((t) => t.key === tierKey);
      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'ResumeScreener',
        description: `${tierDef?.name ?? tierKey} plan${plan ? ` — ${formatMoney(plan.amount, plan.currency)}/mo` : ''} — ${agency.name}`,
        theme: { color: '#4f46e5' },
        handler: async (response: any) => {
          await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          setBusyTier(null);
          router.refresh();
        },
        modal: {
          ondismiss: () => setBusyTier(null),
        },
      });
      rzp.on('payment.failed', () => setBusyTier(null));
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusyTier(null);
    }
  };

  const cancelSubscription = async () => {
    if (!confirm("Cancel your agency's subscription? This takes effect immediately.")) return;
    setError(null);
    setBusyTier('cancel' as TierKey);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not cancel.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <div className="space-y-5">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" onReady={() => setScriptReady(true)} />

      <div className="card p-6">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">{agency.name}</p>
            <p className="text-xs text-slate-400">
              {currentTier
                ? `${TIERS.find((t) => t.key === currentTier)?.name ?? currentTier} plan`
                : 'No plan selected yet'}
            </p>
          </div>
          <motion.span
            key={status}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASSES[config.tone]}`}
          >
            {config.label}
          </motion.span>
        </div>

        {status === 'active' && agency.current_period_end && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
            <IconCheckCircle className="h-4 w-4 text-green-600" />
            Paid through {new Date(agency.current_period_end).toLocaleDateString()}
          </p>
        )}

        {status === 'halted' && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-amber-700">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            The last renewal charge failed and retries were exhausted. Subscribing again will start a fresh billing
            cycle.
          </p>
        )}

        {status === 'pending' && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-amber-700">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            A recent renewal charge failed — Razorpay is retrying automatically. No action needed yet.
          </p>
        )}

        {status === 'active' && (
          <div className="mt-4">
            <motion.button
              onClick={cancelSubscription}
              disabled={busyTier !== null || !isAdmin}
              whileHover={busyTier || !isAdmin ? undefined : { scale: 1.03 }}
              whileTap={busyTier || !isAdmin ? undefined : { scale: 0.97 }}
              className="btn-secondary"
            >
              {busyTier === ('cancel' as TierKey) ? <IconLoader className="h-4 w-4" /> : 'Cancel subscription'}
            </motion.button>
          </div>
        )}
      </div>

      {!isAdmin ? (
        <p className="text-sm text-slate-400">Only your agency admin can choose or change a plan.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const plan = plans[tier.key];
            const isCurrent = currentTier === tier.key && isOccupied;
            const blockedByOtherTier = isOccupied && currentTier !== tier.key;
            const busy = busyTier === tier.key;

            return (
              <motion.div
                key={tier.key}
                whileHover={isCurrent ? undefined : { y: -4 }}
                className={`card flex flex-col p-5 ${isCurrent ? 'ring-2 ring-brand-500' : ''}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium text-slate-900">{tier.name}</p>
                  {isCurrent && status === 'active' && (
                    <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      <IconCheck className="h-3 w-3" /> Current
                    </span>
                  )}
                </div>
                <p className="mb-3 text-xs text-slate-500">{tier.tagline}</p>

                <p className="mb-1 text-2xl font-semibold text-slate-900">
                  {plan ? (
                    <>
                      {formatMoney(plan.amount, plan.currency)}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </>
                  ) : (
                    <span className="text-base font-normal text-slate-400">Not configured</span>
                  )}
                </p>
                <p className="mb-4 text-sm text-slate-500">{formatJobLimit(tier.jobLimit)}</p>

                <div className="mt-auto">
                  {!plan ? (
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                      <IconAlertTriangle className="h-3.5 w-3.5" /> Set {tier.envVar} to enable this tier.
                    </p>
                  ) : isCurrent && status === 'active' ? (
                    <p className="text-center text-sm text-slate-400">You're on this plan</p>
                  ) : isCurrent && RESUMABLE_CHECKOUT.includes(status) ? (
                    <motion.button
                      onClick={() => startCheckout(tier.key)}
                      disabled={busy}
                      whileHover={busy ? undefined : { scale: 1.03 }}
                      whileTap={busy ? undefined : { scale: 0.97 }}
                      className="btn-primary w-full justify-center"
                    >
                      {busy ? (
                        <>
                          <IconLoader className="h-4 w-4" /> Opening…
                        </>
                      ) : (
                        'Complete payment'
                      )}
                    </motion.button>
                  ) : blockedByOtherTier ? (
                    <p className="text-center text-xs text-slate-400">Cancel your current plan to switch</p>
                  ) : (
                    <motion.button
                      onClick={() => startCheckout(tier.key)}
                      disabled={busy}
                      whileHover={busy ? undefined : { scale: 1.03 }}
                      whileTap={busy ? undefined : { scale: 0.97 }}
                      className="btn-primary w-full justify-center"
                    >
                      {busy ? (
                        <>
                          <IconLoader className="h-4 w-4" /> Opening…
                        </>
                      ) : (
                        <>
                          <IconSparkles className="h-4 w-4" /> Subscribe
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
