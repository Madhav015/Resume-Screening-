'use client';

import { Suspense } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { login } from './actions';
import AuthShell from '@/components/AuthShell';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { IconArrowRight, IconLoader } from '@/components/ui/icons';

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
          <IconLoader className="h-4 w-4" /> Signing in…
        </>
      ) : (
        <>
          Sign in <IconArrowRight className="h-4 w-4" />
        </>
      )}
    </motion.button>
  );
}

function LoginForm() {
  const [state, formAction] = useFormState(login, { error: null });
  const next = useSearchParams().get('next') || '/dashboard';

  return (
    <motion.form
      action={formAction}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-4"
    >
      <input type="hidden" name="next" value={next} />
      <motion.div variants={staggerItem}>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </motion.div>
      <motion.div variants={staggerItem}>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
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
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Sign in to your agency's workspace."
      footer={
        <>
          No account yet?{' '}
          <Link href="/signup" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
