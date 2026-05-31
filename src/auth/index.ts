import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isNative, nativeRedirectUrl } from '../platform';
import { parseCallbackUrl } from './deepLinkCallback';

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
  // Native: redirect back to our custom-scheme deep link and open the OAuth flow
  // in the system browser ourselves (the WebView must not navigate away). The
  // `appUrlOpen` listener in App.tsx catches the return and finishes the
  // PKCE code exchange. Web: unchanged — Supabase redirects the current tab.
  if (isNative()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: nativeRedirectUrl(), skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_system');
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

/**
 * Finish a native OAuth flow from an incoming deep-link URL.
 *
 * No-op for deep links that are not our auth callback. Throws on a provider
 * error or a failed code exchange so the caller can surface it.
 */
export async function exchangeDeepLinkCode(url: string): Promise<void> {
  const result = parseCallbackUrl(url);
  if (!result) return;
  if ('error' in result) throw new Error(result.error);

  const { error } = await supabase.auth.exchangeCodeForSession(result.code);
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
