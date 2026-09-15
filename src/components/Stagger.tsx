'use client';

// Generic list-entrance wrappers so a server component can map over its own
// data (members, invite codes, ...) while still getting a staggered reveal
// — the server component renders the <li> content as `children`, this just
// supplies the motion context around it.

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.ul initial="hidden" animate="visible" variants={staggerContainer} className={className}>
      {children}
    </motion.ul>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.li variants={staggerItem} className={className}>
      {children}
    </motion.li>
  );
}
