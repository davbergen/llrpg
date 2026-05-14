import type { SupabaseClient } from '@supabase/supabase-js';
import type { Repo, PersistedState } from './types';
import { hydratePersisted, isPersistedShape } from './types';

/**
 * v1 strategy: stash the full PersistedState as JSON in `heroes.state`.
 * The normalized columns from the slice-20 schema stay around for analytics +
 * future granular reads, but the client treats `state` as source of truth.
 */
export class SupabaseAdapter implements Repo {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<PersistedState | null> {
    const { data, error } = await this.client
      .from('heroes')
      .select('state')
      .eq('user_id', this.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.state == null) return null;
    if (!isPersistedShape(data.state)) return null;
    return hydratePersisted(data.state);
  }

  async save(state: PersistedState): Promise<void> {
    const { error } = await this.client
      .from('heroes')
      .upsert(
        {
          user_id: this.userId,
          state,
          name: state.hero?.name ?? null,
          class_type: state.hero?.classType ?? null,
          level: state.gameState.level,
          xp: state.gameState.xp,
          hp: state.gameState.hp,
          max_hp: state.gameState.maxHp,
          gold: state.gameState.gold,
          gems: state.gameState.gems?.balance ?? 0,
          streak_days: state.gameState.streakState?.count ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (error) throw error;
  }

  async wipe(): Promise<void> {
    const { error } = await this.client
      .from('heroes')
      .update({ state: null })
      .eq('user_id', this.userId);
    if (error) throw error;
  }
}
