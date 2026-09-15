'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { jobLimitFor } from '@/lib/billing/tiers';

const skillSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(1).max(5),
});

const jobSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  must_have_skills: z.array(skillSchema),
  nice_to_have_skills: z.array(skillSchema),
  deal_breakers: z.array(z.string().min(1)),
  weights: z.object({
    must_have: z.number().min(0).max(100),
    nice_to_have: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    deal_breakers: z.number().min(0).max(100),
  }),
});

export type JobFormState = { error: string | null };

// The client component serializes the skill lists / weights to JSON strings
// before submitting (simplest way to pass structured data through a native
// <form action> without wiring up a client-side fetch call).
export async function createJob(_prev: JobFormState, formData: FormData): Promise<JobFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single();
  if (!profile) return { error: 'No agency found for this account.' };

  // Plan enforcement: a tier grants a cap on concurrently OPEN jobs (see
  // src/lib/billing/tiers.ts). Checked here, fail-fast, before doing any
  // form parsing or a write.
  const { data: agencyBilling } = await supabase
    .from('agencies')
    .select('subscription_status, subscription_tier')
    .eq('id', profile.agency_id)
    .single();
  const limit = jobLimitFor(agencyBilling?.subscription_status, agencyBilling?.subscription_tier);
  if (limit <= 0) {
    return { error: 'Your agency needs an active subscription to create jobs. Go to Billing to subscribe.' };
  }
  if (Number.isFinite(limit)) {
    const { count } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', profile.agency_id)
      .eq('status', 'open');
    if ((count ?? 0) >= limit) {
      return {
        error: `You've reached your plan's limit of ${limit} active job${
          limit === 1 ? '' : 's'
        }. Close an existing job, or upgrade your plan on the Billing page.`,
      };
    }
  }

  let parsed;
  try {
    parsed = jobSchema.parse({
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      must_have_skills: JSON.parse(String(formData.get('must_have_skills') || '[]')),
      nice_to_have_skills: JSON.parse(String(formData.get('nice_to_have_skills') || '[]')),
      deal_breakers: JSON.parse(String(formData.get('deal_breakers') || '[]')),
      weights: JSON.parse(String(formData.get('weights') || '{}')),
    });
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.errors[0].message : 'Invalid form data.' };
  }

  const weightSum = Object.values(parsed.weights).reduce((a, b) => a + b, 0);
  if (weightSum !== 100) {
    return { error: `Scoring weights must add up to 100 (currently ${weightSum}).` };
  }
  if (parsed.must_have_skills.length === 0) {
    return { error: 'Add at least one must-have skill.' };
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      agency_id: profile.agency_id,
      created_by: user.id,
      title: parsed.title,
      description: parsed.description || null,
      must_have_skills: parsed.must_have_skills,
      nice_to_have_skills: parsed.nice_to_have_skills,
      deal_breakers: parsed.deal_breakers,
      weights: parsed.weights,
    })
    .select('id')
    .single();

  if (error || !job) return { error: error?.message ?? 'Could not create job.' };

  redirect(`/dashboard/jobs/${job.id}`);
}
