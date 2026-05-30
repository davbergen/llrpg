import { Capacitor } from '@capacitor/core';

/**
 * Single source of truth for platform branching.
 *
 * `true` when running inside the Capacitor native shell (Android/iOS WebView),
 * `false` on the web build. Wrap every platform-specific branch in this so the
 * decision lives in one testable place instead of scattered `Capacitor` calls.
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Custom-scheme callback URL used for native OAuth redirects.
 *
 * Stub for slice 3 (#67 deep-link Google OAuth): native sign-in bounces out to
 * the system browser and returns here, whereas web keeps using
 * `window.location.origin`. Kept in sync with `appId` in `capacitor.config.ts`.
 */
export function nativeRedirectUrl(): string {
  return 'com.davbergen.lrpg://auth/callback';
}
