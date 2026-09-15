import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import type { CandidateWithScore } from '@/lib/types';
import ResumeUploader from '@/components/ResumeUploader';
import CandidateTable from '@/components/CandidateTable';
import StatusPoller from '@/components/StatusPoller';
import EmptyState from '@/components/EmptyState';
import { IconArrowRight, IconFileText } from '@/components/ui/icons';

export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  const supabase = createServerSupabase();

  // RLS scopes both queries to the caller's agency — a jobId from another
  // agency simply comes back empty, which we turn into a 404.
  const { data: job } = await supabase.from('jobs').select('*').eq('id', params.jobId).single();
  if (!job) notFound();

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*, candidate_scores(*)')
    .eq('job_id', params.jobId)
    .order('created_at', { ascending: false });

  const list = (candidates ?? []).map((c) => ({
    ...c,
    candidate_scores: Array.isArray(c.candidate_scores) ? c.candidate_scores[0] ?? null : c.candidate_scores,
  })) as CandidateWithScore[];

  const inFlight = list.some((c) => c.status === 'pending' || c.status === 'processing');

  return (
    <div>
      <StatusPoller active={inFlight} />

      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <IconArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to jobs
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{job.title}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{job.must_have_skills.length}</span> must-have ·{' '}
            <span className="font-medium text-slate-700">{job.nice_to_have_skills.length}</span> nice-to-have ·{' '}
            <span className="font-medium text-slate-700">{job.deal_breakers.length}</span> deal-breaker
            {job.deal_breakers.length === 1 ? '' : 's'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {job.status}
        </span>
      </div>

      <div className="mb-8">
        <ResumeUploader jobId={job.id} />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<IconFileText className="h-5 w-5" />}
          tone="slate"
          title="No resumes uploaded yet"
          description="Drag resumes into the box above to start screening candidates against this role."
        />
      ) : (
        <CandidateTable candidates={list} />
      )}
    </div>
  );
}
