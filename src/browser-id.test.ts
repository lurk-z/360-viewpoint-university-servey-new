import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserId } from './browser-id';

describe('browser ID generation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses randomUUID when the browser provides it', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '12345678-1234-4234-9234-123456789abc'
    });
    expect(createBrowserId()).toBe('12345678-1234-4234-9234-123456789abc');
  });

  it('creates a UUID-compatible ID when randomUUID is unavailable over LAN HTTP', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab);
        return bytes;
      }
    });
    expect(createBrowserId()).toBe('abababab-abab-4bab-abab-abababababab');
  });
});
