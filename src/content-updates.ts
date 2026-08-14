import type { ContentKind } from './content';
import { createBrowserId } from './browser-id';

export type ContentUpdateScope = 'draft' | 'public';
export type ContentUpdateKind = ContentKind | 'media' | 'tour';

export interface ContentUpdateMessage {
  readonly type: 'fitm-content-updated';
  readonly scope: ContentUpdateScope;
  readonly kind: ContentUpdateKind;
  readonly id?: string;
  readonly timestamp: number;
  readonly senderId: string;
}

export const CONTENT_UPDATE_CHANNEL = 'fitm-content-updates';
export const CONTENT_UPDATE_STORAGE_KEY = 'fitm-content-update';
const CONTENT_UPDATE_KINDS: readonly ContentUpdateKind[] = [
  'faculties',
  'programs',
  'activities',
  'hotspot_contents',
  'media',
  'tour'
];

let browserSenderId: string | undefined;

function getSenderId(): string {
  if (!browserSenderId) browserSenderId = createBrowserId();
  return browserSenderId;
}

export function isContentUpdateMessage(value: unknown): value is ContentUpdateMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ContentUpdateMessage>;
  return message.type === 'fitm-content-updated'
    && (message.scope === 'draft' || message.scope === 'public')
    && typeof message.kind === 'string'
    && CONTENT_UPDATE_KINDS.includes(message.kind as ContentUpdateKind)
    && typeof message.timestamp === 'number'
    && Number.isFinite(message.timestamp)
    && typeof message.senderId === 'string'
    && (message.id === undefined || typeof message.id === 'string');
}

export function broadcastContentUpdate(input: {
  readonly scope: ContentUpdateScope;
  readonly kind: ContentUpdateKind;
  readonly id?: string;
}): void {
  if (typeof window === 'undefined') return;
  const message: ContentUpdateMessage = {
    type: 'fitm-content-updated',
    ...input,
    timestamp: Date.now(),
    senderId: getSenderId()
  };

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CONTENT_UPDATE_CHANNEL);
    channel.postMessage(message);
    channel.close();
  }

  try {
    window.localStorage.setItem(CONTENT_UPDATE_STORAGE_KEY, JSON.stringify(message));
  } catch {
    // Live updates still work through BroadcastChannel when storage is unavailable.
  }
}

export function subscribeContentUpdates(listener: (message: ContentUpdateMessage) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const senderId = getSenderId();
  let lastMessageKey = '';
  const receive = (value: unknown): void => {
    if (!isContentUpdateMessage(value) || value.senderId === senderId) return;
    const messageKey = `${value.senderId}:${value.timestamp}:${value.scope}:${value.kind}:${value.id ?? ''}`;
    if (messageKey === lastMessageKey) return;
    lastMessageKey = messageKey;
    listener(value);
  };
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CONTENT_UPDATE_CHANNEL) : undefined;
  if (channel) channel.onmessage = (event) => receive(event.data);
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== CONTENT_UPDATE_STORAGE_KEY || !event.newValue) return;
    try {
      receive(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed messages from unrelated scripts or browser extensions.
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}
