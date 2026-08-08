import { describe, expect, it } from 'vitest';
import { broadcastContentUpdate, isContentUpdateMessage } from './content-updates';

describe('content update messages', () => {
  it('accepts a complete public update message', () => {
    expect(isContentUpdateMessage({
      type: 'fitm-content-updated',
      scope: 'public',
      kind: 'programs',
      id: 'program-id',
      timestamp: 1,
      senderId: 'tab-id'
    })).toBe(true);
  });

  it('rejects malformed scopes, kinds, and timestamps', () => {
    expect(isContentUpdateMessage({
      type: 'fitm-content-updated',
      scope: 'private',
      kind: 'programs',
      timestamp: 1,
      senderId: 'tab-id'
    })).toBe(false);
    expect(isContentUpdateMessage({
      type: 'fitm-content-updated',
      scope: 'public',
      kind: 'unknown-table',
      timestamp: Number.NaN,
      senderId: 'tab-id'
    })).toBe(false);
  });

  it('is safe to broadcast during server rendering', () => {
    expect(() => broadcastContentUpdate({ scope: 'draft', kind: 'tour' })).not.toThrow();
  });
});
