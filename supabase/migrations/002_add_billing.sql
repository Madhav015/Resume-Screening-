-- ============================================================================
-- Billing (Razorpay Subscriptions) — additive migration
--
-- Run this once in the Supabase SQL editor against the EXISTING project
-- (unlike schema.sql, which is only for a brand-new project — re-running
-- schema.sql here would fail on policies that already exist). Everything
-- below uses `if not exists` / `drop policy if exists` guards so it's safe
-- to re-run this file itself if something fails partway through.
--
-- One subscription per agency, since billing is per-tenant here — matches
-- the existing multi-tenancy model in schema.sql.
-- ============================================================================

alter table public.agencies
  add column if not exists razorpay_customer_id     text,
  add column if not exists razorpay_subscription_id  text,
  add column if not exists subscription_plan_id      text,
  add column if not exists current_period_end        timestamptz,
  add column if not exists subscription_status       text not null default 'none';

-- Separate check constraint (not inline) so it can be re-created safely if
-- Razorpay's status set ever needs to change.
alter table public.agencies drop constraint if exists agencies_subscription_status_check;
alter table public.agencies add constraint agencies_subscription_status_check
  check (subscription_status in (
    'none',          -- never started checkout
    'created',        -- subscription created, waiting on customer to authorize in Checkout
    'authenticated',  -- first payment/mandate authorized
    'active',         -- currently paying, in good standing
    'pending',        -- a renewal charge failed, Razorpay is retrying
    'halted',         -- renewal retries exhausted — access should be restricted
    'cancelled',      -- cancelled (by agency or after too many failures)
    'completed',      -- fixed-count plan ran to completion (shouldn't happen with our open-ended total_count)
    'paused',         -- temporarily paused
    'expired'         -- authorization link/window expired before the customer completed checkout
  ));

create index if not exists agencies_razorpay_subscription_id_idx
  on public.agencies(razorpay_subscription_id);

-- Raw webhook event log — mainly for debugging ("why does this agency show
-- halted?") and an audit trail, not a strict at-most-once dedupe ledger.
-- Razorpay's webhook payloads don't consistently carry a client-usable
-- unique event id across all event types, so status transitions themselves
-- are written to be idempotent (see src/app/api/webhooks/razorpay/route.ts)
-- rather than relying on this table to reject duplicate deliveries.
create table if not exists public.billing_events (
  id         uuid primary key default gen_random_uuid(),
  event      text not null,
  agency_id  uuid references public.agencies(id) on delete set null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_agency_id_idx on public.billing_events(agency_id);

alter table public.billing_events enable row level security;

drop policy if exists "agency admins can read own billing events" on public.billing_events;
create policy "agency admins can read own billing events"
  on public.billing_events for select
  using (
    agency_id = public.current_agency_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- No insert/update/delete policy for billing_events or the new agencies
-- columns beyond what already exists: all billing writes happen server-side
-- via the service-role client (src/lib/supabase/server.ts's
-- createAdminSupabase), which bypasses RLS — same pattern as
-- candidate_scores. The existing "agency admins can update their agency"
-- policy on public.agencies already covers the new columns for any
-- future client-side admin use.
