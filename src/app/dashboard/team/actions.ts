'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase/server';

export async function createInvite() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data: profile } = await supabase.from('profiles').select('agency_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Only agency admins can create invite codes.');

  const code = randomBytes(4).toString('hex'); // e.g. "a1b2c3d4" — short enough to read out loud

  const { error } = await supabase.from('agency_invites').insert({
    agency_id: profile.agency_id,
    code,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/team');
}
