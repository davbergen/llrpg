import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn() },
}));

import { Capacitor } from '@capacitor/core';
import { isNative, nativeRedirectUrl } from './index';

const isNativePlatform = vi.mocked(Capacitor.isNativePlatform);

afterEach(() => {
  isNativePlatform.mockReset();
});

describe('isNative', () => {
  it('returns true inside the native shell', () => {
    isNativePlatform.mockReturnValue(true);
    expect(isNative()).toBe(true);
  });

  it('returns false on the web build', () => {
    isNativePlatform.mockReturnValue(false);
    expect(isNative()).toBe(false);
  });
});

describe('nativeRedirectUrl', () => {
  it('uses the appId custom scheme matching capacitor.config.ts', () => {
    expect(nativeRedirectUrl()).toBe('com.davbergen.lrpg://auth/callback');
  });
});
