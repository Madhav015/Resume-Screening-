'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { IconLogOut } from '@/components/ui/icons';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      title="Sign out"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      <IconLogOut className="h-4 w-4" />
    </button>
  );
}
