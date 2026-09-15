import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client for use in Server Components, Server Actions,
// and Route Handlers. Reads/writes the auth cookie so `auth.getUser()` and
// RLS-scoped queries work the same way they do in the browser client.
export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore because middleware.ts refreshes the session on every request.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

// Admin client using the service-role key, which bypasses Row Level
// Security entirely. ONLY use this in trusted server code that has already
// figured out the correct agency_id itself (e.g. the resume scoring route),
// never in anything that echoes a client-supplied agency_id back into a query.
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
