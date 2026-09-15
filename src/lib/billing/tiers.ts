// The 3-tier (Starter / Growth / Pro) subscription model.
//
// Prices are deliberately NOT hardcoded here — each tier's actual ₹ amount
// lives on its own Plan in the Razorpay Dashboard (Products > Subscriptions >
// Plans). This file only maps a tier to (a) which env var holds that tier's
// Razorpay plan_id, and (b) what usage limit the tier grants. The billing
// page fetches the live price from Razorpay per tier, so this file never
// goes stale relative to what's actually being charged.
//
// "Active jobs" here means concurrently OPEN job postings (job.status ===
// 'open'), not a rolling monthly count that resets — simpler for an agency
// to reason about ("I have 2 of my 3 slots used") and matches how most ATS/
// recruiting tools price seats. Closing a job frees up its slot immediately.

export type TierKey = 'starter' | 'growth' | 'pro';

export type TierDef = {
  key: TierKey;
  name: string;
  tagline: string;
  /** Max concurrently open jobs an agency on this tier may have. null = unlimited. */
  jobLimit: number | null;
  /** Env var holding this tier's Razorpay plan_id. */
  envVar: 'RAZORPAY_PLAN_ID_STARTER' | 'RAZORPAY_PLAN_ID_GROWTH' | 'RAZORPAY_PLAN_ID_PRO';
};

export const TIERS: TierDef[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For agencies just getting going',
    jobLimit: 3,
    envVar: 'RAZORPAY_PLAN_ID_STARTER',
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'For agencies hiring across multiple roles at once',
    jobLimit: 10,
    envVar: 'RAZORPAY_PLAN_ID_GROWTH',
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'For high-volume recruiting teams',
    jobLimit: null,
    envVar: 'RAZORPAY_PLAN_ID_PRO',
  },
];

export function tierByKey(key: string | null | undefined): TierDef | undefined {
  return TIERS.find((t) => t.key === key);
}

export function tierByPlanId(planId: string | null | undefined): TierDef | undefined {
  if (!planId) return undefined;
  return TIERS.find((t) => process.env[t.envVar] === planId);
}

export function formatJobLimit(jobLimit: number | null): string {
  return jobLimit === null ? 'Unlimited active jobs' : `Up to ${jobLimit} active job${jobLimit === 1 ? '' : 's'}`;
}

/**
 * How many concurrently-open jobs an agency may have right now, given its
 * subscription status and tier. Only an ACTIVE subscription grants the
 * tier's limit — every other status (none, created, pending, halted,
 * cancelled, ...) means 0, i.e. billing must be resolved before new jobs
 * can be created. Existing open jobs are never force-closed by a status
 * change; this only blocks creating *new* ones.
 */
export function jobLimitFor(status: string | null | undefined, tier: string | null | undefined): number {
  if (status !== 'active') return 0;
  const t = tierByKey(tier);
  if (!t) return 0;
  return t.jobLimit === null ? Infinity : t.jobLimit;
}
