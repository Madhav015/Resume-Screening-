-- Run this once in the Supabase SQL editor against the EXISTING project,
-- after 001_*.sql and 002_add_billing.sql have already been applied.
--
-- Adds which tier (Starter / Growth / Pro) an agency is subscribed to, for
-- the 3-tier pricing model. See src/lib/billing/tiers.ts for what each tier
-- means (price lives on the tier's Plan in the Razorpay Dashboard, not
-- here — this column just records which one the agency picked).

alter table public.agencies
  add column if not exists subscription_tier text;

alter table public.agencies drop constraint if exists agencies_subscription_tier_check;
alter table public.agencies add constraint agencies_subscription_tier_check
  check (subscription_tier is null or subscription_tier in ('starter', 'growth', 'pro'));

-- No RLS changes needed — subscription_tier is just another column on
-- agencies, already covered by the existing "agency members can read own
-- agency" / "agency admins can update own agency" policies from schema.sql.
