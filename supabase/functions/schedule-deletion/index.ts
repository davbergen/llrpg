// Edge Function: schedule-deletion
// Records a deletion request for the caller. The row's run_after defaults to
// now() + 24h; the run-scheduled-deletions job hard-deletes once that passes.
//
// Users can cancel via cancel-deletion until run_after.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing_auth' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) return json({ error: 'invalid_auth' }, 401);

  const { data, error } = await supabase
    .from('scheduled_deletions')
    .upsert({ user_id: userRes.user.id }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return json({ error: 'insert_failed', detail: error.message }, 500);
  return json({ scheduled: data });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
