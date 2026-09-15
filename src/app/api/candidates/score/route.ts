import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { scoreResume } from '@/lib/claude/scoring';
import { mapWithConcurrency } from '@/lib/concurrency';
import type { Job } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // batch scoring can take a while; requires a Vercel plan that allows it (see deployment notes)

const CONCURRENCY = 3; // parallel Claude calls — keeps us well under rate limits

// Called by the client right after a successful upload (see
// ResumeUploader.tsx), or with { jobId } to (re)score every pending
// candidate for a job. Auth is checked with the normal cookie-scoped
// client so a caller can only ever trigger scoring for their own agency's
// candidates; the actual Claude call + write uses the admin client because
// candidate_scores has no client-side insert policy (see supabase/schema.sql).
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const explicitIds: string[] = Array.isArray(body.candidateIds) ? body.candidateIds : [];
  const jobId: string | undefined = body.jobId;

  let query = supabase.from('candidates').select('id').eq('status', 'pending');
  query = explicitIds.length > 0 ? query.in('id', explicitIds) : jobId ? query.eq('job_id', jobId) : query;
  const { data: candidateRows } = await query;

  const candidateIds = (candidateRows ?? []).map((c) => c.id);
  if (candidateIds.length === 0) return NextResponse.json({ scored: 0, failed: 0 });

  const admin = createAdminSupabase();
  let scored = 0;
  let failed = 0;

  await mapWithConcurrency(candidateIds, CONCURRENCY, async (candidateId) => {
    try {
      await admin.from('candidates').update({ status: 'processing' }).eq('id', candidateId);

      const { data: candidate, error: candidateError } = await admin
        .from('candidates')
        .select('id, agency_id, job_id, resume_text')
        .eq('id', candidateId)
        .single();
      if (candidateError || !candidate) throw new Error(candidateError?.message ?? 'Candidate not found.');
      if (!candidate.resume_text) throw new Error('No resume text to score.');

      const { data: job, error: jobError } = await admin.from('jobs').select('*').eq('id', candidate.job_id).single();
      if (jobError || !job) throw new Error(jobError?.message ?? 'Job not found.');

      const result = await scoreResume(job as Job, candidate.resume_text);

      const { error: scoreInsertError } = await admin.from('candidate_scores').upsert(
        {
          candidate_id: candidate.id,
          agency_id: candidate.agency_id,
          overall_score: result.overall_score,
          recommendation: result.recommendation,
          matched_must_have: result.matched_must_have,
          missing_must_have: result.missing_must_have,
          matched_nice_to_have: result.matched_nice_to_have,
          red_flags: result.red_flags,
          deal_breaker_hits: result.deal_breaker_hits,
          summary: result.summary,
          reasoning: result.reasoning,
          years_experience: result.years_experience,
          raw_model_output: result,
        },
        { onConflict: 'candidate_id' }
      );
      if (scoreInsertError) throw new Error(scoreInsertError.message);

      await admin
        .from('candidates')
        .update({
          status: 'scored',
          candidate_name: result.candidate_name,
          candidate_email: result.candidate_email,
          error_message: null,
        })
        .eq('id', candidateId);

      scored++;
    } catch (e) {
      failed++;
      await admin
        .from('candidates')
        .update({ status: 'failed', error_message: e instanceof Error ? e.message : 'Scoring failed.' })
        .eq('id', candidateId);
    }
  });

  return NextResponse.json({ scored, failed });
}
