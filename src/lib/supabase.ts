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
    // On native the WebView's localStorage is wiped under storage pressure, which
    // silently logs users out. Persist the session in Capacitor Preferences
    // instead. Web keeps Supabase's default localStorage adapter.
    ...(isNative() ? { storage: preferencesSessionStorage } : {}),
  },
});
