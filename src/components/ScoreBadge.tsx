'use client';

import { motion } from 'framer-motion';
import type { Recommendation } from '@/lib/types';

const STYLES: Record<Recommendation, string> = {
  strong_match: 'bg-green-100 text-green-800',
  possible_match: 'bg-brand-100 text-brand-800',
  weak_match: 'bg-amber-100 text-amber-800',
  not_a_match: 'bg-red-100 text-red-800',
};

const DOT: Record<Recommendation, string> = {
  strong_match: 'bg-green-500',
  possible_match: 'bg-brand-500',
  weak_match: 'bg-amber-500',
  not_a_match: 'bg-red-500',
};

const LABELS: Record<Recommendation, string> = {
  strong_match: 'Strong match',
  possible_match: 'Possible match',
  weak_match: 'Weak match',
  not_a_match: 'Not a match',
};

export default function ScoreBadge({ recommendation }: { recommendation: Recommendation }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[recommendation]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[recommendation]}`} />
      {LABELS[recommendation]}
    </motion.span>
  );
}

// Color scale for the raw 0-100 number so a glance at the table tells you
// roughly where a candidate lands even before reading the recommendation.
export function scoreToneClasses(score: number) {
  if (score >= 75) return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200';
  if (score >= 50) return 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200';
  if (score >= 25) return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';
}

export function ScorePill({ score }: { score: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.4, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className={`inline-flex h-8 w-11 items-center justify-center rounded-lg text-sm font-semibold ${scoreToneClasses(score)}`}
    >
      {Math.round(score)}
    </motion.span>
  );
}
