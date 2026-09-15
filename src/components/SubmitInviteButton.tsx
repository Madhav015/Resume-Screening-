'use client';

import { useFormStatus } from 'react-dom';
import { motion } from 'framer-motion';
import { IconLoader, IconPlus } from '@/components/ui/icons';

export default function SubmitInviteButton() {
  const { pending } = useFormStatus();
  return (
    <motion.button
      whileHover={pending ? undefined : { scale: 1.05 }}
      whileTap={pending ? undefined : { scale: 0.95 }}
      disabled={pending}
      className="btn-secondary px-3 py-1.5 text-xs"
    >
      {pending ? <IconLoader className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
      New invite code
    </motion.button>
  );
}
