import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';
import DashboardNav from '@/components/DashboardNav';
import { IconBriefcase } from '@/components/ui/icons';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, agencies(name)')
    .eq('id', user.id)
    .single();

  const agencyName = (profile?.agencies as any)?.name ?? 'Your agency';
  const displayName = profile?.full_name ?? user.email ?? '';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
                <IconBriefcase className="h-4 w-4" />
              </span>
              <span>
                ResumeScreener <span className="font-normal text-slate-400">· {agencyName}</span>
              </span>
            </Link>
            <DashboardNav />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                {initials(displayName)}
              </span>
              <span className="text-slate-700">{displayName}</span>
              {profile?.role === 'admin' && (
                <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-600">
                  Admin
                </span>
              )}
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
