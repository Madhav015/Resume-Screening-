'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client, used in client components (forms, the
// dropzone uploader, etc). Auth'd requests automatically carry the user's
// session cookie, and every query is still subject to the RLS policies in
// supabase/schema.sql — this client can never see another agency's rows.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
