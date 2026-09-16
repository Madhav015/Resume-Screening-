# ResumeScreener

A self-serve, multi-tenant resume screening app. Recruiting agencies sign up, create job postings with their own
screening criteria, upload candidate resumes, and get a ranked, AI-scored dashboard — all without you operating
anything on their behalf.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth + Storage, with Row Level Security for multi-tenancy)
· Claude API (Anthropic) for resume scoring · Tailwind CSS · deployed on Vercel.

## 1. Architecture at a glance

```
Recruiter's browser
      │
      ▼
Next.js app (Vercel)
  ├─ Server Components / Server Actions  — read/write Postgres as the signed-in user (RLS-scoped)
  ├─ /api/resumes/upload                 — stores the file in Supabase Storage, extracts text
  └─ /api/candidates/score               — calls Claude, writes structured scores (service-role key)
      │
      ▼
Supabase
  ├─ Postgres  — agencies, profiles, jobs, candidates, candidate_scores (RLS on every table)
  ├─ Auth      — email/password, session cookies
  └─ Storage   — private "resumes" bucket, one folder per agency
      │
      ▼
Claude API (Anthropic) — scores one resume against one job's criteria, returns structured JSON via tool use
```

Multi-tenancy is enforced at the database layer, not just in application code: every table has a Postgres
Row Level Security policy that scopes rows to `current_agency_id()` (the signed-in user's agency). Even if there
were a bug in a page's query, Postgres itself would refuse to return another agency's rows. See
`supabase/schema.sql` for every policy.

## 2. One-time setup

### a. Create the Supabase project
1. Create a project at supabase.com.
2. In the SQL Editor, paste and run the entire contents of `supabase/schema.sql`. This creates every table, RLS
   policy, the new-user provisioning trigger, and the private `resumes` Storage bucket.
3. In **Authentication → Providers**, email/password is enabled by default — that's all this app uses.
4. In **Authentication → URL Configuration**, set the Site URL to your deployed domain once you have one (you can
   leave it as `http://localhost:3000` while developing).
5. In **Authentication → Email Templates**, the default "Confirm signup" template works as-is; consider disabling
   "Confirm email" under Auth settings while you're testing locally so you don't need a working email step.
6. From **Project Settings → API**, grab the Project URL, `anon` public key, and `service_role` secret key.

### b. Get a Claude API key
Create a key at console.anthropic.com. `CLAUDE_MODEL` defaults to `claude-sonnet-5` in `src/lib/claude/scoring.ts` —
change the env var if you want a different model.

### c. Configure environment variables
Copy `.env.example` to `.env.local` and fill in the five values from the steps above.

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign up (this creates your own agency), create a job, and drop in a couple of
resumes to confirm scoring works end to end before you deploy.

## 4. Deploy to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Vercel, "Add New Project" → import the repo. Framework preset auto-detects as Next.js.
3. Under **Environment Variables**, add the same five variables from `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
   `CLAUDE_MODEL` (optional), and `NEXT_PUBLIC_SITE_URL` (set this to your real Vercel URL, e.g.
   `https://resume-screener.vercel.app`, or your custom domain).
4. Deploy.
5. Back in Supabase → Authentication → URL Configuration, update the Site URL (and add a Redirect URL) to match
   your real deployed domain, so signup confirmation emails link to the right place.
6. Visit your live URL, sign up as your first ("admin") user for a test agency, and run through the whole flow
   once for real before you hand out logins.

### Billing
The app ships a built-in 3-tier Razorpay subscription system — **Starter / Growth / Pro** with concurrent-open-job
limits of 3 / 10 / unlimited (`src/lib/billing/tiers.ts`), subscribe → verify → cancel routes (`/api/billing/subscribe`,
`/api/billing/verify`, `/api/billing/cancel`), a Razorpay webhook handler (`/api/webhooks/razorpay`), a billing page at
`/dashboard/billing`, and the supporting schema in `supabase/schema.sql` (`razorpay_customer_id`,
`razorpay_subscription_id`, `subscription_plan_id`, `subscription_status`, `subscription_tier`, `billing_events`).

Prices are **not** in the code — each tier's ₹ amount lives on its own Plan in the Razorpay Dashboard (Products →
Subscriptions → Plans), so the live price always reflects what's actually charged. Wire it up via env vars:
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `RAZORPAY_PLAN_ID_STARTER` / `_GROWTH` / `_PRO`
(each tier's Razorpay plan id). In the Razorpay Dashboard under Settings → Webhooks, point the webhook URL at
`https://<your-domain>/api/webhooks/razorpay` with a secret you generate yourself (not `RAZORPAY_KEY_SECRET`) and
subscribe to the `subscription.*` events listed in `src/app/api/webhooks/razorpay/route.ts`
(`subscription.authenticated`, `activated`, `charged`, `completed`, `pending`, `halted`, `cancelled`, `paused`,
`resumed`). The webhook is the source of truth for subscription state.

For your first customers you can also skip checkout entirely: create their agency's first login yourself (sign up
using their work email, or have their point of contact sign up), then use the **Team** page to generate an invite
code they can hand to the rest of their recruiters — anyone who signs up with that code joins the same agency
automatically, scoped by Row Level Security from the moment their account is created.

### Scaling past the MVP
- **Batch size / serverless duration.** `/api/candidates/score` scores resumes 3-at-a-time and can run up to
  `maxDuration = 300` seconds (edit the constant in that file). Vercel's Hobby plan caps function duration lower
  than that in some regions — if you expect agencies to upload 50+ resumes in one batch, either upgrade to a Pro
  plan or move scoring to a background job (Supabase Edge Functions + `pg_cron`, Inngest, or Trigger.dev are all
  good fits) so the client doesn't have to hold a connection open while it happens.
- **Retries.** A candidate whose scoring call fails is marked `status = 'failed'` with an `error_message` and is
  simply excluded from the "pending" batch on the next `/api/candidates/score` call for that job — add a "Retry
  failed" button that flips `status` back to `pending` when you want one.
- **Rate limits.** `mapWithConcurrency` in `src/lib/concurrency.ts` is the one knob to turn if you hit Anthropic rate
  limits on very large batches — lower `CONCURRENCY` in `src/app/api/candidates/score/route.ts`.
- **File size cap.** Currently 8MB/resume (`MAX_FILE_BYTES` in `src/app/api/resumes/upload/route.ts`); raise it if
  needed but keep in mind Vercel's default request body limit and the `bodySizeLimit` set in `next.config.js`.

## 5. Where things live (for the walkthrough in chat)

| Requirement | Files |
|---|---|
| Auth + multi-tenant accounts | `supabase/schema.sql` (RLS + signup trigger), `src/app/login`, `src/app/signup`, `src/middleware.ts` |
| Job creation screen | `src/components/JobForm.tsx`, `src/app/dashboard/jobs/new/*` |
| Resume upload + extraction | `src/components/ResumeUploader.tsx`, `src/app/api/resumes/upload/route.ts`, `src/lib/resume/extract.ts` |
| Claude scoring | `src/lib/claude/scoring.ts` (system prompt + JSON schema), `src/app/api/candidates/score/route.ts` |
| Results dashboard | `src/components/CandidateTable.tsx`, `src/app/dashboard/jobs/[jobId]/page.tsx` |
| Team / invite codes | `src/app/dashboard/team/*` |
