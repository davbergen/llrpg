import { createClient } from '@supabase/supabase-js';
import { isNative } from '../platform';
import { preferencesSessionStorage } from '../repos/preferencesStorage';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Native finishes OAuth by exchanging an authorization code from a custom-scheme
    // deep link (`exchangeCodeForSession`), which requires the PKCE flow. Web keeps
    // Supabase's default implicit flow so the existing browser path is untouched.
    ...(isNative()
      ? {
          flowType: 'pkce' as const,
          // The WebView's localStorage is wiped under storage pressure, which
          // silently logs users out. Persist the session (and the PKCE code
          // verifier) in Capacitor Preferences instead.
          storage: preferencesSessionStorage,
        }
      : {}),
  },
});
