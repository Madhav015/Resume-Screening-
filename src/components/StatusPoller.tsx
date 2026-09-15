'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// While any candidate for this job is still 'pending'/'processing', keep
// refreshing the server-rendered page every few seconds so the recruiter
// sees scores land without having to manually reload. Stops automatically
// once nothing is in flight.
export default function StatusPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
