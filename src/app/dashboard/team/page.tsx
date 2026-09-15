import { createServerSupabase } from '@/lib/supabase/server';
import { createInvite } from './actions';
import CopyInviteCode from '@/components/CopyInviteCode';
import SubmitInviteButton from '@/components/SubmitInviteButton';
import { StaggerList, StaggerItem } from '@/components/Stagger';
import { IconUsers } from '@/components/ui/icons';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default async function TeamPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: true });

  const { data: invites } = await supabase
    .from('agency_invites')
    .select('*')
    .order('created_at', { ascending: false });

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Team</h1>
      <p className="mb-6 text-sm text-slate-500">Everyone with access to your agency's workspace.</p>

      <div className="card mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <IconUsers className="h-4 w-4 text-slate-400" /> Members
        </h2>
        <StaggerList className="divide-y divide-slate-100">
          {members?.map((m) => (
            <StaggerItem key={m.id} className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                  {initials(m.full_name || '?')}
                </span>
                <span className="text-sm text-slate-800">{m.full_name || '(no name set)'}</span>
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-500">
                {m.role}
              </span>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>

      {isAdmin && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Invite codes</h2>
            <form action={createInvite}>
              <SubmitInviteButton />
            </form>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Share a code with a teammate — they enter it under "Join with invite code" on the signup page and land
            in your agency's workspace, not their own.
          </p>
          <StaggerList className="divide-y divide-slate-100">
            {invites?.map((inv) => (
              <StaggerItem key={inv.id} className="flex items-center justify-between py-2.5">
                <CopyInviteCode code={inv.code} />
                <span className="text-xs text-slate-400">
                  {inv.uses}/{inv.max_uses} used · expires {new Date(inv.expires_at).toLocaleDateString()}
                </span>
              </StaggerItem>
            ))}
            {!invites?.length && <li className="py-2 text-xs text-slate-400">No invite codes yet.</li>}
          </StaggerList>
        </div>
      )}
    </div>
  );
}
