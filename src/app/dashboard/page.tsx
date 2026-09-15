import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Job } from '@/lib/types';
import { jobLimitFor, formatJobLimit, tierByKey } from '@/lib/billing/tiers';
import JobsGrid from '@/components/JobsGrid';
import EmptyState from '@/components/EmptyState';
import NewJobButton from '@/components/NewJobButton';
import { IconAlertTriangle, IconBriefcase } from '@/components/ui/icons';

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  // No agency_id filter needed here — RLS on public.jobs already restricts
  // this to the signed-in user's own agency (see supabase/schema.sql).
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, candidates(count)')
    .order('created_at', { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('agency_id, role').eq('id', user!.id).single();
  const { data: agency } = await supabase
    .from('agencies')
    .select('subscription_status, subscription_tier')
    .eq('id', profile!.agency_id)
    .single();

  const list = (jobs ?? []) as (Job & { candidates: { count: number }[] })[];
  const openCount = list.filter((j) => j.status === 'open').length;
  const limit = jobLimitFor(agency?.subscription_status, agency?.subscription_tier);
  const atLimit = openCount >= limit;
  const tier = tierByKey(agency?.subscription_tier);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500">
            {list.length} open role{list.length === 1 ? '' : 's'} being screened
            {Number.isFinite(limit) && (
              <span className="text-slate-400"> · {openCount}/{limit} active {tier ? `(${tier.name})` : ''}</span>
            )}
          </p>
        </div>
        {atLimit ? (
          <Link href="/dashboard/billing" className="btn-secondary">
            <IconAlertTriangle className="h-4 w-4" />
            {limit === 0 ? 'Subscribe to create jobs' : 'Upgrade to add more jobs'}
          </Link>
        ) : (
          <NewJobButton />
        )}
      </div>

      {atLimit && (
        <p className="mb-4 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <IconAlertTriangle className="h-4 w-4 shrink-0" />
          {limit === 0
            ? "Your agency doesn't have an active subscription — subscribe on the Billing page to create jobs."
            : `You've used all ${formatJobLimit(limit).toLowerCase()} on your ${tier?.name ?? 'current'} plan. Close a job or upgrade to add more.`}
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<IconBriefcase className="h-5 w-5" />}
          title="No jobs yet"
          description={
            atLimit
              ? "Your agency needs an active subscription before you can create a job posting."
              : 'Create your first job posting to define what a great candidate looks like — then start dropping in resumes.'
          }
          action={
            atLimit ? (
              <Link href="/dashboard/billing" className="btn-primary">
                <IconAlertTriangle className="h-4 w-4" /> Go to Billing
              </Link>
            ) : (
              <NewJobButton label="Create your first job" />
            )
          }
        />
      ) : (
        <JobsGrid jobs={list} />
      )}
    </div>
  );
}
