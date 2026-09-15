'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import type { AuthFormState } from '../login/actions';

// Handles both flows:
//  - "Start a new agency account" -> agency_name is set, no invite_code.
//  - "Join an existing agency"    -> invite_code is set.
// public.handle_new_user() (see supabase/schema.sql) reads this metadata
// when the auth.users row is created and provisions the right agency_id.
export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('full_name') || '').trim();
  const mode = String(formData.get('mode') || 'new_agency');
  const agencyName = String(formData.get('agency_name') || '').trim();
  const inviteCode = String(formData.get('invite_code') || '').trim();

  if (!email || !password || !fullName) {
    return { error: 'Fill in your name, email, and password.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (mode === 'new_agency' && !agencyName) {
    return { error: 'Enter your agency name.' };
  }
  if (mode === 'join_agency' && !inviteCode) {
    return { error: 'Enter the invite code your admin sent you.' };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      data: {
        full_name: fullName,
        agency_name: mode === 'new_agency' ? agencyName : undefined,
        invite_code: mode === 'join_agency' ? inviteCode : undefined,
      },
    },
  });

  if (error) return { error: error.message };

  return { error: null };
}
