/**
 * Pure parser for the native OAuth callback deep link.
 *
 * After the system browser completes Google sign-in, Supabase redirects to our
 * custom-scheme URL (e.g. `com.davbergen.lrpg://auth/callback?code=...`).
 * Capacitor delivers that URL to the JS layer via `App`'s `appUrlOpen` event.
 *
 * This module turns the raw URL string into a typed result so the I/O at the
 * call site (`supabase.auth.exchangeCodeForSession`) is a one-liner and all the
 * branching is unit-testable without a device or any Capacitor mock.
 *
 * We deliberately match on the `auth/callback` host + path rather than the full
 * `appId`-derived scheme so this stays correct through the #70 rebrand, which
 * changes the package id (and therefore the scheme) but not the path.
 */
export type CallbackResult = { code: string } | { error: string };

/**
 * Parse an incoming deep-link URL.
 *
 * - Returns `{ code }` when it is our auth callback carrying an authorization code.
 * - Returns `{ error }` when it is our auth callback but reports an error or is
 *   missing the code.
 * - Returns `null` for anything that is not our auth callback (malformed URLs,
 *   other deep links) so the listener can ignore it.
 */
export function parseCallbackUrl(url: string): CallbackResult | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.host !== 'auth' || parsed.pathname !== '/callback') {
    return null;
  }

  const params = parsed.searchParams;
  const error = params.get('error_description') ?? params.get('error');
  if (error) {
    return { error };
  }

  const code = params.get('code');
  if (code) {
    return { code };
  }

  return { error: 'OAuth callback was missing an authorization code.' };
}
