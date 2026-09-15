import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerSupabase } from '@/lib/supabase/server';
import { extractResumeText, isSupportedResumeFile, truncateResumeText } from '@/lib/resume/extract';

// Must run in the Node.js runtime (not Edge) — pdf-parse/mammoth and the
// Buffer APIs below need it.
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB per resume

type UploadResult =
  | { fileName: string; ok: true; candidateId: string }
  | { fileName: string; ok: false; error: string };

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No agency found.' }, { status: 400 });

  const formData = await req.formData();
  const jobId = String(formData.get('jobId') || '');
  if (!jobId) return NextResponse.json({ error: 'Missing jobId.' }, { status: 400 });

  // RLS scopes this to the caller's own agency — if the job belongs to a
  // different agency this simply returns no row, giving a clean 404 instead
  // of leaking whether the job id exists.
  const { data: job } = await supabase.from('jobs').select('id, agency_id').eq('id', jobId).single();
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 });

  const files = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });

  const results: UploadResult[] = [];

  for (const file of files) {
    try {
      if (!isSupportedResumeFile(file)) {
        results.push({ fileName: file.name, ok: false, error: 'Only PDF and DOCX files are supported.' });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        results.push({ fileName: file.name, ok: false, error: 'File is larger than 8MB.' });
        continue;
      }

      const candidateId = randomUUID();
      const buffer = Buffer.from(await file.arrayBuffer());
      const storagePath = `${job.agency_id}/${jobId}/${candidateId}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from('resumes').upload(storagePath, buffer, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);

      let resumeText = '';
      let status: 'pending' | 'failed' = 'pending';
      let errorMessage: string | null = null;
      try {
        resumeText = truncateResumeText(await extractResumeText(buffer, file.name));
        if (!resumeText.trim()) throw new Error('No extractable text found in this file.');
      } catch (e) {
        status = 'failed';
        errorMessage = e instanceof Error ? e.message : 'Could not read this file.';
      }

      const { error: insertError } = await supabase.from('candidates').insert({
        id: candidateId,
        agency_id: job.agency_id,
        job_id: jobId,
        uploaded_by: user.id,
        file_name: file.name,
        storage_path: storagePath,
        resume_text: resumeText || null,
        status,
        error_message: errorMessage,
      });
      if (insertError) throw new Error(insertError.message);

      results.push({ fileName: file.name, ok: status === 'pending', candidateId, error: errorMessage ?? undefined } as UploadResult);
    } catch (e) {
      results.push({ fileName: file.name, ok: false, error: e instanceof Error ? e.message : 'Upload failed.' });
    }
  }

  const candidateIds = results.filter((r): r is Extract<UploadResult, { ok: true }> => r.ok).map((r) => r.candidateId);

  return NextResponse.json({ results, candidateIds });
}
