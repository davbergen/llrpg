// Edge Function: cancel-deletion
// Removes the caller's scheduled_deletions row. Safe to call when no row
// exists — returns ok either way.

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

  const { error } = await supabase
    .from('scheduled_deletions')
    .delete()
    .eq('user_id', userRes.user.id);

  if (error) return json({ error: 'delete_failed', detail: error.message }, 500);
  return json({ cancelled: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
