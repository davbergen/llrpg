import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AuthState =
  | { status: 'loading'; user: null; session: null }
  | { status: 'signed-in'; user: User; session: Session }
  | { status: 'signed-out'; user: null; session: null };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, session: null });

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState(toState(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(toState(session));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

function toState(session: Session | null): AuthState {
  if (session?.user) {
    return { status: 'signed-in', user: session.user, session };
  }
  return { status: 'signed-out', user: null, session: null };
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function ensureHeroRow(userId: string): Promise<void> {
  const { error } = await supabase
    .from('heroes')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}
