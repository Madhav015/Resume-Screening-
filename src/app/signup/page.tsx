'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { signup } from './actions';
import AuthShell from '@/components/AuthShell';
import { staggerContainer, staggerItem, popIn } from '@/lib/motion';
import { IconArrowRight, IconLoader, IconMail } from '@/components/ui/icons';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={pending ? undefined : { scale: 1.03 }}
      whileTap={pending ? undefined : { scale: 0.97 }}
      className="btn-primary w-full"
    >
      {pending ? (
        <>
          <IconLoader className="h-4 w-4" /> Creating account…
        </>
      ) : (
        <>
          Create account <IconArrowRight className="h-4 w-4" />
        </>
      )}
    </motion.button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState(signup, { error: null });
  const [mode, setMode] = useState<'new_agency' | 'join_agency'>('new_agency');
  const [submitted, setSubmitted] = useState(false);

  if (submitted && !state.error) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Check your email"
        subtitle=""
        footer={
          <>
            Wrong email?{' '}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline">
              Start over
            </Link>
          </>
        }
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={popIn}
          className="rounded-xl border border-brand-100 bg-brand-50 p-5 text-center"
        >
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 }}
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm"
          >
            <IconMail className="h-5 w-5" />
          </motion.span>
          <p className="text-sm text-slate-600">
            We sent a confirmation link. Click it to activate your account, then log in.
          </p>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Set up your agency's workspace, or join a teammate's with an invite code."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="relative mb-5 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm">
        {(['new_agency', 'join_agency'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`relative z-10 rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === m ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="signup-tab-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-md bg-white shadow-sm"
              />
            )}
            {m === 'new_agency' ? 'New agency' : 'Join with code'}
          </button>
        ))}
      </div>

      <motion.form
        action={formAction}
        onSubmit={() => setSubmitted(true)}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-4"
      >
        <input type="hidden" name="mode" value={mode} />

        <motion.div variants={staggerItem}>
          <label className="mb-1 block text-sm font-medium text-slate-700">Your name</label>
          <input name="full_name" required autoComplete="name" className="field" />
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'new_agency' ? (
            <motion.div
              key="agency_name"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
            >
              <label className="mb-1 block text-sm font-medium text-slate-700">Agency name</label>
              <input name="agency_name" required placeholder="Acme Talent Partners" className="field" />
            </motion.div>
          ) : (
            <motion.div
              key="invite_code"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <label className="mb-1 block text-sm font-medium text-slate-700">Invite code</label>
              <input name="invite_code" required placeholder="Ask your agency admin for this" className="field" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={staggerItem}>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="field"
          />
        </motion.div>

        <AnimatePresence>
          {state.error && (
            <motion.p
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {state.error}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.div variants={staggerItem}>
          <SubmitButton />
        </motion.div>
      </motion.form>
    </AuthShell>
  );
}
