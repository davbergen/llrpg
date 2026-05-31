import { describe, expect, it } from 'vitest';
import { parseCallbackUrl } from './deepLinkCallback';

describe('parseCallbackUrl', () => {
  it('extracts the authorization code from a valid callback URL', () => {
    expect(parseCallbackUrl('com.davbergen.lrpg://auth/callback?code=abc123')).toEqual({
      code: 'abc123',
    });
  });

  it('survives the #70 rebrand by matching host + path, not the scheme', () => {
    expect(parseCallbackUrl('com.example.renamed://auth/callback?code=xyz')).toEqual({
      code: 'xyz',
    });
  });

  it('returns the error_description when the provider reports a failure', () => {
    const url = 'com.davbergen.lrpg://auth/callback?error=access_denied&error_description=User+denied';
    expect(parseCallbackUrl(url)).toEqual({ error: 'User denied' });
  });

  it('falls back to the error code when no description is present', () => {
    expect(parseCallbackUrl('com.davbergen.lrpg://auth/callback?error=access_denied')).toEqual({
      error: 'access_denied',
    });
  });

  it('reports a missing code as an error on an otherwise valid callback', () => {
    const result = parseCallbackUrl('com.davbergen.lrpg://auth/callback');
    expect(result).not.toBeNull();
    expect(result && 'error' in result).toBe(true);
  });

  it('ignores a malformed URL', () => {
    expect(parseCallbackUrl('not a url')).toBeNull();
  });

  it('ignores deep links that are not the auth callback', () => {
    expect(parseCallbackUrl('com.davbergen.lrpg://some/other/path?code=abc')).toBeNull();
  });

  it('ignores a callback to a different path on the auth host', () => {
    expect(parseCallbackUrl('com.davbergen.lrpg://auth/logout?code=abc')).toBeNull();
  });
});
