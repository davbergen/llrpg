// Edge Function: export-user-data
// Returns a JSON blob with every row keyed on the caller's auth.uid() across
// the 8 LinguaQuest tables. The client triggers a download from the response.
//
// RLS guarantees row isolation; we still scope each query explicitly by
// user_id as defense in depth.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const USER_TABLES = [
  'heroes',
  'fsrs_cards',
  'inventory',
  'dungeon_runs',
  'lesson_sessions',
  'reports',
  'gem_ledger',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'missing_auth' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return json({ error: 'invalid_auth' }, 401);
  }
  const userId = userRes.user.id;

  const tables: Record<string, unknown> = {};
  for (const t of USER_TABLES) {
    const { data, error } = await supabase.from(t).select('*').eq('user_id', userId);
    if (error) return json({ error: 'query_failed', table: t, detail: error.message }, 500);
    tables[t] = data ?? [];
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: userId, email: userRes.user.email },
    tables,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="linguaquest-export-${userId}.json"`,
    },
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
