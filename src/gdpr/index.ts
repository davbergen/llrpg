import { supabase } from '../lib/supabase';

export interface ScheduledDeletion {
  user_id: string;
  requested_at: string;
  run_after: string;
}

export async function fetchScheduledDeletion(userId: string): Promise<ScheduledDeletion | null> {
  const { data, error } = await supabase
    .from('scheduled_deletions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function scheduleDeletion(): Promise<ScheduledDeletion> {
  const { data, error } = await supabase.functions.invoke<{ scheduled: ScheduledDeletion }>(
    'schedule-deletion',
    { body: {} },
  );
  if (error) throw error;
  if (!data?.scheduled) throw new Error('schedule-deletion returned no row');
  return data.scheduled;
}

export async function cancelDeletion(): Promise<void> {
  const { error } = await supabase.functions.invoke('cancel-deletion', { body: {} });
  if (error) throw error;
}

export async function downloadExport(): Promise<void> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes.session?.access_token;
  if (!token) throw new Error('not signed in');

  const url = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${url}/functions/v1/export-user-data`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`export failed: ${res.status} ${text}`);
  }
  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const userId = (await supabase.auth.getUser()).data.user?.id ?? 'user';
  a.download = `linguaquest-export-${userId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
}
