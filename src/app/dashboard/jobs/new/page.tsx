import Link from 'next/link';
import JobForm from '@/components/JobForm';
import { IconArrowRight } from '@/components/ui/icons';

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <IconArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to jobs
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">New job</h1>
      <p className="mb-6 text-sm text-slate-500">
        Define what a great candidate looks like. No technical knowledge needed — this feeds directly into
        the automated screening.
      </p>
      <div className="card p-6">
        <JobForm />
      </div>
    </div>
  );
}
