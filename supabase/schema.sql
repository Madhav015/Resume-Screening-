-- ============================================================================
-- ResumeScreener database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh
-- project. It sets up multi-tenant tables, row-level security so one
-- agency's data is never visible to another, a signup trigger that wires a
-- new auth user into an agency (new or via invite code), and a private
-- Storage bucket for resume files.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Core tables
-- ---------------------------------------------------------------------------

create table if not exists public.agencies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- One row per authenticated user, 1:1 with auth.users. This is what ties a
-- login to a tenant (agency_id) and a role within that tenant.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  full_name  text,
  role       text not null default 'recruiter' check (role in ('admin', 'recruiter')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_agency_id_idx on public.profiles(agency_id);

-- Invite codes let an agency admin bring teammates into the SAME agency
-- instead of each signup creating a brand new agency. Simple on purpose:
-- no email-sending infra required for a v1.
create table if not exists public.agency_invites (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  code       text not null unique,
  created_by uuid references auth.users(id),
  max_uses   int not null default 10,
  uses       int not null default 0,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade,
  created_by          uuid references auth.users(id),
  title               text not null,
  description         text,
  -- Each skill is stored as {"name": "React", "weight": 3} so weighting is
  -- per-skill, not just per-category. See lib/types.ts for the shared shape.
  must_have_skills    jsonb not null default '[]',
  nice_to_have_skills jsonb not null default '[]',
  deal_breakers       jsonb not null default '[]',
  -- Category-level weights used to combine the sub-scores Claude returns
  -- into one overall score. Must sum to 100 (enforced in the app layer).
  weights             jsonb not null default '{"must_have": 50, "nice_to_have": 25, "experience": 15, "deal_breakers": 10}',
  status              text not null default 'open' check (status in ('open', 'closed', 'archived')),
  created_at          timestamptz not null default now()
);

create index if not exists jobs_agency_id_idx on public.jobs(agency_id);

create table if not exists public.candidates (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references public.agencies(id) on delete cascade,
  job_id         uuid not null references public.jobs(id) on delete cascade,
  uploaded_by    uuid references auth.users(id),
  file_name      text not null,
  storage_path   text not null,
  candidate_name text,
  candidate_email text,
  resume_text    text,
  status         text not null default 'pending' check (status in ('pending', 'processing', 'scored', 'failed')),
  error_message  text,
  created_at     timestamptz not null default now()
);

create index if not exists candidates_job_id_idx on public.candidates(job_id);
create index if not exists candidates_agency_id_idx on public.candidates(agency_id);

create table if not exists public.candidate_scores (
  id                    uuid primary key default gen_random_uuid(),
  candidate_id          uuid not null unique references public.candidates(id) on delete cascade,
  agency_id             uuid not null references public.agencies(id) on delete cascade,
  overall_score         numeric not null,
  recommendation        text not null check (recommendation in ('strong_match', 'possible_match', 'weak_match', 'not_a_match')),
  matched_must_have     jsonb not null default '[]',
  missing_must_have     jsonb not null default '[]',
  matched_nice_to_have  jsonb not null default '[]',
  red_flags             jsonb not null default '[]',
  deal_breaker_hits     jsonb not null default '[]',
  summary               text,
  reasoning             text,
  years_experience      numeric,
  raw_model_output      jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists candidate_scores_agency_id_idx on public.candidate_scores(agency_id);

-- Billing: one Razorpay subscription per agency (see
-- supabase/migrations/002_add_billing.sql for the standalone version of
-- this, meant for an already-deployed project — that file and this block
-- describe the same end state).
alter table public.agencies
  add column if not exists razorpay_customer_id     text,
  add column if not exists razorpay_subscription_id  text,
  add column if not exists subscription_plan_id      text,
  add column if not exists current_period_end        timestamptz,
  add column if not exists subscription_status       text not null default 'none';

alter table public.agencies drop constraint if exists agencies_subscription_status_check;
alter table public.agencies add constraint agencies_subscription_status_check
  check (subscription_status in (
    'none', 'created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'paused', 'expired'
  ));

create index if not exists agencies_razorpay_subscription_id_idx on public.agencies(razorpay_subscription_id);

-- 3-tier pricing (Starter / Growth / Pro) — see
-- supabase/migrations/003_add_billing_tiers.sql for the standalone version
-- of this, and src/lib/billing/tiers.ts for what each tier means.
alter table public.agencies
  add column if not exists subscription_tier text;

alter table public.agencies drop constraint if exists agencies_subscription_tier_check;
alter table public.agencies add constraint agencies_subscription_tier_check
  check (subscription_tier is null or subscription_tier in ('starter', 'growth', 'pro'));

create table if not exists public.billing_events (
  id         uuid primary key default gen_random_uuid(),
  event      text not null,
  agency_id  uuid references public.agencies(id) on delete set null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_agency_id_idx on public.billing_events(agency_id);

-- ---------------------------------------------------------------------------
-- 2. Helper function: current user's agency_id
--
-- SECURITY DEFINER + a fixed search_path so it can read `profiles` even
-- though RLS is enabled on that table (otherwise policies on `profiles`
-- that call this function would recurse into themselves).
-- ---------------------------------------------------------------------------

create or replace function public.current_agency_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select agency_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security — this is what makes the app multi-tenant safe.
-- Every table is scoped to rows where agency_id = the caller's own agency.
-- ---------------------------------------------------------------------------

alter table public.agencies         enable row level security;
alter table public.profiles         enable row level security;
alter table public.agency_invites   enable row level security;
alter table public.jobs             enable row level security;
alter table public.candidates       enable row level security;
alter table public.candidate_scores enable row level security;
alter table public.billing_events   enable row level security;

-- agencies: a user can read (and an admin can update) only their own agency.
create policy "agency members can read their agency"
  on public.agencies for select
  using (id = public.current_agency_id());

create policy "agency admins can update their agency"
  on public.agencies for update
  using (id = public.current_agency_id()
         and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- profiles: readable within the same agency; a user may only update their own row.
create policy "read profiles in own agency"
  on public.profiles for select
  using (agency_id = public.current_agency_id());

create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- agency_invites: only admins in the agency can view/create invite codes.
create policy "admins manage invites"
  on public.agency_invites for all
  using (agency_id = public.current_agency_id()
         and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (agency_id = public.current_agency_id());

-- jobs: standard "belongs to my agency" CRUD policy, split by action so it's
-- easy to tighten later (e.g. only admins can delete).
create policy "read jobs in own agency"
  on public.jobs for select
  using (agency_id = public.current_agency_id());

create policy "create jobs in own agency"
  on public.jobs for insert
  with check (agency_id = public.current_agency_id());

create policy "update jobs in own agency"
  on public.jobs for update
  using (agency_id = public.current_agency_id());

create policy "delete jobs in own agency"
  on public.jobs for delete
  using (agency_id = public.current_agency_id());

-- candidates: same pattern.
create policy "read candidates in own agency"
  on public.candidates for select
  using (agency_id = public.current_agency_id());

create policy "create candidates in own agency"
  on public.candidates for insert
  with check (agency_id = public.current_agency_id());

create policy "update candidates in own agency"
  on public.candidates for update
  using (agency_id = public.current_agency_id());

create policy "delete candidates in own agency"
  on public.candidates for delete
  using (agency_id = public.current_agency_id());

-- candidate_scores: read-only from the client. Rows are written by the
-- server-side scoring route using the service-role key, which bypasses RLS
-- entirely, so we only need a select policy here.
create policy "read scores in own agency"
  on public.candidate_scores for select
  using (agency_id = public.current_agency_id());

-- billing_events: admins only, read-only from the client — all writes go
-- through the service-role client in the webhook/API routes.
create policy "agency admins can read own billing events"
  on public.billing_events for select
  using (
    agency_id = public.current_agency_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. New-user provisioning trigger
--
-- Fires when a row is inserted into auth.users (i.e. right after someone
-- signs up). Reads `agency_name` and optional `invite_code` out of the
-- signup call's user_metadata (see app/(auth)/signup — supabase.auth.signUp
-- passes these via `options.data`).
--   - If an invite_code is present and valid, the user joins that agency.
--   - Otherwise a brand new agency is created and the user becomes its admin.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_invite_code text;
  v_agency_name text;
  v_role text := 'admin';
begin
  v_invite_code := new.raw_user_meta_data ->> 'invite_code';
  v_agency_name := coalesce(new.raw_user_meta_data ->> 'agency_name', 'My Agency');

  if v_invite_code is not null then
    select agency_id into v_agency_id
    from public.agency_invites
    where code = v_invite_code
      and uses < max_uses
      and expires_at > now();

    if v_agency_id is not null then
      update public.agency_invites set uses = uses + 1 where code = v_invite_code;
      v_role := 'recruiter';
    end if;
  end if;

  if v_agency_id is null then
    insert into public.agencies (name) values (v_agency_name) returning id into v_agency_id;
    v_role := 'admin';
  end if;

  insert into public.profiles (id, agency_id, full_name, role)
  values (new.id, v_agency_id, new.raw_user_meta_data ->> 'full_name', v_role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Storage bucket for resume files
--
-- Files are stored at "<agency_id>/<job_id>/<candidate_id>-<filename>" so
-- the first path segment can be checked against the caller's agency_id in
-- the storage policies below, exactly like the table RLS above.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "agency members read own resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = public.current_agency_id()::text
  );

create policy "agency members upload own resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = public.current_agency_id()::text
  );

create policy "agency members delete own resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = public.current_agency_id()::text
  );
