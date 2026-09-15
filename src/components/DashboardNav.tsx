'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { IconBriefcase, IconUsers, IconCreditCard } from '@/components/ui/icons';

const LINKS = [
  { href: '/dashboard', label: 'Jobs', icon: IconBriefcase, match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/jobs') },
  { href: '/dashboard/team', label: 'Team', icon: IconUsers, match: (p: string) => p.startsWith('/dashboard/team') },
  { href: '/dashboard/billing', label: 'Billing', icon: IconCreditCard, match: (p: string) => p.startsWith('/dashboard/billing') },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname ?? '');
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {active && (
              <motion.span
                layoutId="dashboard-nav-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-lg bg-brand-50"
              />
            )}
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
