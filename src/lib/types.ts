// Shared shapes used by the job form, the scoring prompt, and the dashboard.
// Keeping these in one place means the JSON we ask Claude to return and the
// JSON we store in Postgres never drift apart.

export type WeightedSkill = {
  name: string;
  /** 1 (nice to have) - 5 (critical). Only used for must-have / nice-to-have lists. */
  weight: number;
};

export type ScoringWeights = {
  must_have: number;
  nice_to_have: number;
  experience: number;
  deal_breakers: number;
};

export type Job = {
  id: string;
  agency_id: string;
  title: string;
  description: string | null;
  must_have_skills: WeightedSkill[];
  nice_to_have_skills: WeightedSkill[];
  deal_breakers: string[];
  weights: ScoringWeights;
  status: 'open' | 'closed' | 'archived';
  created_at: string;
};

export type Candidate = {
  id: string;
  agency_id: string;
  job_id: string;
  file_name: string;
  storage_path: string;
  candidate_name: string | null;
  candidate_email: string | null;
  resume_text: string | null;
  status: 'pending' | 'processing' | 'scored' | 'failed';
  error_message: string | null;
  created_at: string;
};

export type Recommendation = 'strong_match' | 'possible_match' | 'weak_match' | 'not_a_match';

export type CandidateScore = {
  id: string;
  candidate_id: string;
  agency_id: string;
  overall_score: number;
  recommendation: Recommendation;
  matched_must_have: string[];
  missing_must_have: string[];
  matched_nice_to_have: string[];
  red_flags: string[];
  deal_breaker_hits: string[];
  summary: string | null;
  reasoning: string | null;
  years_experience: number | null;
  created_at: string;
};

export type CandidateWithScore = Candidate & { candidate_scores: CandidateScore | null };

// Mirrors the check constraint on public.agencies.subscription_status —
// see supabase/migrations/002_add_billing.sql for what each state means.
export type SubscriptionStatus =
  | 'none'
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'completed'
  | 'paused'
  | 'expired';

// Mirrors the check constraint on public.agencies.subscription_tier — see
// src/lib/billing/tiers.ts for what each tier means.
export type SubscriptionTier = 'starter' | 'growth' | 'pro';

export type Agency = {
  id: string;
  name: string;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  subscription_plan_id: string | null;
  subscription_tier: SubscriptionTier | null;
  subscription_status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
};

// The exact JSON shape we require back from Claude for one resume. This is
// mirrored in lib/claude/scoring.ts's tool schema.
export type ClaudeScoringResult = {
  candidate_name: string | null;
  candidate_email: string | null;
  years_experience: number | null;
  matched_must_have: string[];
  missing_must_have: string[];
  matched_nice_to_have: string[];
  deal_breaker_hits: string[];
  red_flags: string[];
  category_scores: {
    must_have: number; // 0-100
    nice_to_have: number; // 0-100
    experience: number; // 0-100
  };
  overall_score: number; // 0-100, computed by Claude using the supplied weights
  recommendation: Recommendation;
  summary: string;
  reasoning: string;
};
