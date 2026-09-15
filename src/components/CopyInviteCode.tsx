'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCheck, IconTicket } from '@/components/ui/icons';

export default function CopyInviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API can be unavailable (older browsers, insecure
          // context) — the code is still visible to select/copy manually.
        }
      }}
      className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 transition-colors hover:bg-slate-200"
      title="Copy invite code"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <IconCheck className="h-3 w-3 text-green-600" />
          </motion.span>
        ) : (
          <motion.span key="ticket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IconTicket className="h-3 w-3 text-slate-400" />
          </motion.span>
        )}
      </AnimatePresence>
      {code}
    </motion.button>
  );
}
