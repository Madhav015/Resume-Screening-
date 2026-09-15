'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconPlus } from '@/components/ui/icons';

export default function NewJobButton({ label = 'New job' }: { label?: string }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block">
      <Link href="/dashboard/jobs/new" className="btn-primary">
        <IconPlus className="h-4 w-4" /> {label}
      </Link>
    </motion.div>
  );
}
