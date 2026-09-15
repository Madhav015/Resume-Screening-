import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import LandingPage from '@/components/landing/LandingPage';

// Signed-in visitors go straight to their dashboard. Everyone else sees the
// marketing page — this is the app's public face, so it's the one route
// that isn't gated behind login.
export default async function Home() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return <LandingPage />;
}
