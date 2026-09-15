'use client';

import { motion } from 'framer-motion';
import { floatSlow, floatSlowReverse, staggerContainer, staggerItem } from '@/lib/motion';
import { IconBriefcase, IconCheckCircle, IconSparkles } from '@/components/ui/icons';

const PITCH_POINTS = [
  'Define must-haves, nice-to-haves, and deal-breakers once per role',
  'Drop in resumes — Claude reads and scores every one against your bar',
  'Sort, filter, and drill into reasoning instead of skimming PDFs',
];

// Shared shell for /login and /signup: a brand panel on larger screens plus
// a centered form card. The brand panel is purely decorative and hidden on
// small screens so mobile just gets the form.
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <motion.div
          {...floatSlow}
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          {...floatSlowReverse}
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative flex items-center gap-2 text-lg font-semibold"
        >
          <motion.span
            initial={{ rotate: -12, scale: 0.7 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
          >
            <IconBriefcase className="h-[18px] w-[18px]" />
          </motion.span>
          ResumeScreener
        </motion.div>

        <motion.div
          className="relative"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.p
            variants={staggerItem}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium"
          >
            <IconSparkles className="h-3.5 w-3.5" /> Powered by Claude
          </motion.p>
          <motion.h2 variants={staggerItem} className="mb-4 text-3xl font-semibold leading-tight">
            Screen every resume like your best recruiter would.
          </motion.h2>
          <ul className="space-y-3">
            {PITCH_POINTS.map((point) => (
              <motion.li key={point} variants={staggerItem} className="flex items-start gap-2.5 text-sm text-brand-50/90">
                <IconCheckCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-200" />
                {point}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="relative text-xs text-brand-100/70"
        >
          Built for recruiting agencies moving at volume.
        </motion.p>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-slate-900 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <IconBriefcase className="h-[18px] w-[18px]" />
            </span>
            ResumeScreener
          </div>

          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">{eyebrow}</p>
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mb-6 text-sm text-slate-500">{subtitle}</p>

          {children}

          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        </motion.div>
      </main>
    </div>
  );
}
