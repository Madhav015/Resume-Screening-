'use client';

// Next.js remounts `template.tsx` on every navigation (unlike layout.tsx,
// which persists) — that's exactly what we want here: every switch between
// Jobs / a job's detail page / New job / Team plays this entrance instead
// of an instant, static swap.

import { motion } from 'framer-motion';
import { pageEnter } from '@/lib/motion';

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={pageEnter}>
      {children}
    </motion.div>
  );
}
