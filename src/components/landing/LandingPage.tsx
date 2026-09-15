'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { floatSlow, floatSlowReverse, staggerContainer, staggerItem } from '@/lib/motion';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBriefcase,
  IconCheckCircle,
  IconFileText,
  IconSearch,
  IconSparkles,
  IconUpload,
  IconUsers,
} from '@/components/ui/icons';

const STEPS = [
  {
    icon: IconBriefcase,
    title: 'Define the role',
    body: 'Set must-have skills, nice-to-haves, deal-breakers, and how much each should count — once per role, no technical setup.',
  },
  {
    icon: IconUpload,
    title: 'Drop in resumes',
    body: 'Drag in PDFs or DOCX files, one at a time or in bulk. Text is extracted automatically, ready for scoring.',
  },
  {
    icon: IconSearch,
    title: 'Get a ranked shortlist',
    body: "Every resume is read and scored against your bar, with reasoning — not just a number — so you know why.",
  },
];

const FEATURES = [
  {
    icon: IconCheckCircle,
    title: 'Scored against your bar',
    body: 'Weighted must-haves, nice-to-haves, experience, and deal-breakers — you set what matters for this specific role.',
  },
  {
    icon: IconFileText,
    title: 'Grounded reasoning',
    body: 'Every score comes with what matched, what’s missing, and any inconsistencies worth a second look — not a black box.',
  },
  {
    icon: IconAlertTriangle,
    title: 'Deal-breakers enforced',
    body: 'A hard rule you set (visa sponsorship, on-call availability, whatever matters) caps the score automatically when it’s hit.',
  },
  {
    icon: IconUsers,
    title: 'Built for a whole team',
    body: 'One shared agency workspace with invite codes — your recruiters see the same jobs and shortlists, not separate silos.',
  },
  {
    icon: IconSparkles,
    title: 'Fairness rules baked in',
    body: 'The scoring prompt explicitly ignores age, gender, and name-based inference, and never penalizes employment gaps on their own.',
  },
  {
    icon: IconUpload,
    title: 'PDF and DOCX, as-is',
    body: 'No reformatting required — upload resumes exactly as candidates sent them.',
  },
];

const SAMPLE_RESULTS = [
  { name: 'Candidate A', role: 'Senior Backend Engineer', score: 91, tone: 'green' as const, label: 'Strong match' },
  { name: 'Candidate B', role: 'Senior Backend Engineer', score: 64, tone: 'brand' as const, label: 'Possible match' },
  { name: 'Candidate C', role: 'Senior Backend Engineer', score: 22, tone: 'red' as const, label: 'Not a match' },
];

const TONE_CLASSES = {
  green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
};

function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <IconBriefcase className="h-4 w-4" />
          </span>
          ResumeScreener
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
          <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
          <a href="#features" className="hover:text-slate-900">Features</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary px-3 py-1.5 text-sm">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary px-3 py-1.5 text-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-gradient text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <motion.div
        {...floatSlow}
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      />
      <motion.div
        {...floatSlowReverse}
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:py-28 lg:grid-cols-2 lg:items-center">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.p
            variants={staggerItem}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium"
          >
            <IconSparkles className="h-3.5 w-3.5" /> Powered by Claude
          </motion.p>
          <motion.h1 variants={staggerItem} className="mb-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Screen every resume like your best recruiter would.
          </motion.h1>
          <motion.p variants={staggerItem} className="mb-8 max-w-lg text-lg text-brand-50/90">
            Define what a great candidate looks like once. Drop in resumes and get a ranked, reasoned shortlist —
            so your team spends time on real candidates, not skimming PDFs.
          </motion.p>
          <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn bg-white text-brand-700 shadow-sm hover:bg-brand-50">
              Try it free <IconArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn border border-white/30 text-white hover:bg-white/10">
              See how it works
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.15 }}
          className="rounded-2xl border border-white/15 bg-white p-5 text-slate-900 shadow-popover"
        >
          <p className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
            Sample results <span className="text-slate-300">Illustrative</span>
          </p>
          <div className="space-y-2">
            {SAMPLE_RESULTS.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.12, type: 'spring', stiffness: 300, damping: 24 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{r.name}</p>
                  <p className="truncate text-xs text-slate-500">{r.role}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[r.tone]}`}>{r.label}</span>
                  <span className={`inline-flex h-8 w-10 items-center justify-center rounded-lg text-sm font-semibold ${TONE_CLASSES[r.tone]}`}>
                    {r.score}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.4 }}
        className="mb-12 text-center"
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">How it works</p>
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Three steps, no setup</h2>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={staggerContainer}
        className="grid gap-6 sm:grid-cols-3"
      >
        {STEPS.map((step, i) => (
          <motion.div key={step.title} variants={staggerItem} className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <step.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-slate-400">Step {i + 1}</span>
            </div>
            <p className="mb-1.5 font-medium text-slate-900">{step.title}</p>
            <p className="text-sm text-slate-500">{step.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
          className="mb-12 text-center"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">Features</p>
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Built for how agencies actually screen</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 350, damping: 24 }}
              className="card p-5"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mb-1 font-medium text-slate-900">{f.title}</p>
              <p className="text-sm text-slate-500">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTABand() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.4 }}
        className="card flex flex-col items-center gap-4 bg-brand-gradient p-10 text-center text-white sm:p-14"
      >
        <h2 className="text-2xl font-semibold sm:text-3xl">Ready to screen smarter?</h2>
        <p className="max-w-md text-brand-50/90">
          Set up your agency's workspace in a couple of minutes and run your first role through it — free to try.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn bg-white text-brand-700 shadow-sm hover:bg-brand-50">
            Try it free <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn border border-white/30 text-white hover:bg-white/10">
            Log in
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-slate-500">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
            <IconBriefcase className="h-3.5 w-3.5" />
          </span>
          ResumeScreener
        </span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-slate-800">Log in</Link>
          <Link href="/signup" className="hover:text-slate-800">Get started</Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <CTABand />
      <Footer />
    </div>
  );
}
