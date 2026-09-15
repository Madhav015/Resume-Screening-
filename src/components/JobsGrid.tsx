'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Job } from '@/lib/types';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { IconArrowRight, IconBriefcase, IconUsers } from '@/components/ui/icons';

type JobWithCount = Job & { candidates: { count: number }[] };

export default function JobsGrid({ jobs }: { jobs: JobWithCount[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {jobs.map((job) => {
        const candidateCount = job.candidates?.[0]?.count ?? 0;
        return (
          <motion.div
            key={job.id}
            variants={staggerItem}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          >
            <Link href={`/dashboard/jobs/${job.id}`} className="card group flex h-full flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <motion.span
                  whileHover={{ rotate: -8 }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                >
                  <IconBriefcase className="h-[18px] w-[18px]" />
                </motion.span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {job.status}
                </span>
              </div>

              <p className="mb-1 font-medium leading-snug text-slate-900 group-hover:text-brand-700">{job.title}</p>
              <p className="mb-4 line-clamp-2 flex-1 text-sm text-slate-500">
                {job.description ||
                  `${job.must_have_skills.length} must-have skill${job.must_have_skills.length === 1 ? '' : 's'} defined.`}
              </p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <IconUsers className="h-4 w-4" />
                  {candidateCount} candidate{candidateCount === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1 font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                  View <IconArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
