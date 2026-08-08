'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeContentUpdates } from '../src/content-updates';
import {
  createFallbackContentSnapshot,
  type PublicContentSnapshot
} from '../src/content';

const LIVE_REFRESH_INTERVAL_MS = 5_000;

function isContentSnapshot(value: unknown): value is PublicContentSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<PublicContentSnapshot>;
  return typeof snapshot.version === 'number'
    && Array.isArray(snapshot.faculties)
    && Array.isArray(snapshot.programs)
    && Array.isArray(snapshot.activities)
    && Array.isArray(snapshot.hotspots);
}

export interface PublicContentState {
  readonly content: PublicContentSnapshot;
}

export function usePublicContent(): PublicContentState {
  const [content, setContent] = useState<PublicContentSnapshot>(() => createFallbackContentSnapshot());
  const [livePreview, setLivePreview] = useState(process.env.NODE_ENV === 'development');
  const versionRef = useRef(content.version);
  const requestRef = useRef<Promise<void> | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback((): Promise<void> => {
    if (requestRef.current) return requestRef.current;
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const request = fetch('/api/content', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Content request failed with ${response.status}`);
        const snapshot: unknown = await response.json();
        if (!isContentSnapshot(snapshot) || !mountedRef.current) return;
        if (snapshot.version !== versionRef.current) {
          versionRef.current = snapshot.version;
          setContent(snapshot);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (requestRef.current === request) {
          requestRef.current = null;
          requestControllerRef.current = null;
        }
      });
    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      requestRef.current = null;
    };
  }, [refresh]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    const previewRequested = new URLSearchParams(window.location.search).get('preview') === 'admin';
    if (!previewRequested) return;
    void fetch('/api/admin/live-status', { cache: 'no-store' })
      .then((response) => setLivePreview(response.ok))
      .catch(() => setLivePreview(false));
  }, []);

  useEffect(() => subscribeContentUpdates((message) => {
    if (message.scope === 'public') void refresh();
  }), [refresh]);

  useEffect(() => {
    const refreshWhenVisible = (): void => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const refreshOnline = (): void => { void refresh(); };
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('online', refreshOnline);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('online', refreshOnline);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!livePreview) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) void refresh();
    }, LIVE_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [livePreview, refresh]);

  return { content };
}
