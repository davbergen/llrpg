// Edge Function: run-scheduled-deletions
// Service-role cleanup job. Hard-deletes every row owned by each user whose
// scheduled_deletions.run_after has passed, then calls auth.admin.deleteUser.
//
// Trigger this on a cron schedule (e.g. every hour) via the Supabase
// dashboard scheduler or pg_cron. Authentication: requires a Bearer token
// matching SCHEDULED_DELETIONS_CRON_SECRET, OR the service role key. This
// keeps the function un-callable by ordinary clients even when published.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Order matters only to keep FK relationships happy if `on delete cascade`
// were ever removed from the schema. With the current schema every table
// already cascades from auth.users, so the explicit deletes are belt-and-
// suspenders — they ensure rows are gone *before* we drop the auth user,
// rather than relying on cascade ordering.
const USER_TABLES = [
  'lesson_sessions',
  'dungeon_runs',
  'fsrs_cards',
  'inventory',
  'reports',
  'gem_ledger',
  'heroes',
] as const;

Deno.serve(async (req) => {
  const expected = Deno.env.get('SCHEDULED_DELETIONS_CRON_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('Authorization') ?? '';
  const presented = auth.replace(/^Bearer\s+/i, '');
  if (presented !== serviceKey && (!expected || presented !== expected)) {
    return json({ error: 'forbidden' }, 403);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: due, error: dueErr } = await admin
    .from('scheduled_deletions')
    .select('user_id, run_after')
    .lte('run_after', new Date().toISOString());

  if (dueErr) return json({ error: 'list_failed', detail: dueErr.message }, 500);

  const results: Array<{ user_id: string; ok: boolean; error?: string }> = [];
  for (const row of due ?? []) {
    try {
      for (const t of USER_TABLES) {
        const { error } = await admin.from(t).delete().eq('user_id', row.user_id);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      const { error: authErr } = await admin.auth.admin.deleteUser(row.user_id);
      if (authErr) throw new Error(`auth: ${authErr.message}`);
      await admin.from('scheduled_deletions').delete().eq('user_id', row.user_id);
      results.push({ user_id: row.user_id, ok: true });
    } catch (e) {
      results.push({
        user_id: row.user_id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return json({ processed: results.length, results });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
