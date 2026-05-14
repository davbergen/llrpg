import { supabase } from '../lib/supabase';
import { LocalAdapter } from './localAdapter';
import { SupabaseAdapter } from './supabaseAdapter';
import { WriteThroughRepo } from './writeThrough';
import type { Repo } from './types';

export type { Repo, PersistedState } from './types';
export { LocalAdapter, loadLocalSync, SAVE_KEY } from './localAdapter';
export { SupabaseAdapter } from './supabaseAdapter';
export { WriteThroughRepo } from './writeThrough';

/** Local-only repo for unauthenticated players. */
export function localOnlyRepo(): Repo {
  return new LocalAdapter();
}

/** Write-through repo for an authenticated user. */
export function authedRepo(userId: string): WriteThroughRepo {
  return new WriteThroughRepo(
    new LocalAdapter(),
    new SupabaseAdapter(supabase, userId),
    (e) => console.warn('Remote save failed (queued for retry):', e),
  );
}
