'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// `icon` takes an already-rendered element (e.g. `<IconBriefcase className="h-5 w-5" />`),
// not a component reference. This is used from Server Components (dashboard/page.tsx,
// jobs/[jobId]/page.tsx) passing into this Client Component — React can serialize a
// JSX element across that boundary, but NOT a raw function/component reference
// ("Functions cannot be passed directly to Client Components" is what a bare
// `icon={IconBriefcase}` throws at runtime, even though local `next build` won't
// catch it since this route is fully dynamic and never gets rendered at build time).
export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'brand',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: 'brand' | 'slate';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card flex flex-col items-center border-dashed p-14 text-center"
    >
      <motion.span
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          tone === 'brand' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400'
        }`}
      >
        {icon}
      </motion.span>
      <p className="mb-1 font-medium text-slate-800">{title}</p>
      <p className={`max-w-sm text-sm text-slate-500 ${action ? 'mb-5' : ''}`}>{description}</p>
      {action}
    </motion.div>
  );
}
