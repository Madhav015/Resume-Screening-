// Shared framer-motion variants/transitions so animation feels consistent
// across the app instead of every component inventing its own timing.
// "Bold" preset per product direction: visible spring motion, not just
// a subtle fade — cards pop and settle rather than just materializing.

import type { Transition, Variants } from 'framer-motion';

export const springy: Transition = { type: 'spring', stiffness: 340, damping: 26 };
export const bouncySpring: Transition = { type: 'spring', stiffness: 420, damping: 18 };

// Whole-page entrance — used in dashboard/template.tsx so every route
// change (jobs list -> job detail -> new job -> team) gets a real
// transition instead of an instant swap.
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

// Parent wrapper for any list of cards/rows that should reveal one after
// another rather than all at once.
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: bouncySpring },
};

// Small elements (icons, badges, pills) popping into existence.
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: bouncySpring },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.15 } },
};

// Slow continuous float for decorative background blobs.
export const floatSlow = {
  animate: {
    y: [0, -22, 0],
    x: [0, 14, 0],
    transition: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const floatSlowReverse = {
  animate: {
    y: [0, 20, 0],
    x: [0, -16, 0],
    transition: { duration: 11, repeat: Infinity, ease: 'easeInOut' },
  },
};
