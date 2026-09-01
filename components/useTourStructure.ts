'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeContentUpdates } from '../src/content-updates';
import {
  getTourStructureDataSignature,
  tourStructureDataSchema,
  type TourStructureSnapshot
} from '../src/tour-structure';

function isSnapshot(value: unknown): value is TourStructureSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TourStructureSnapshot>;
  return typeof candidate.version === 'number'
    && (candidate.source === 'database' || candidate.source === 'fallback')
    && tourStructureDataSchema.safeParse(candidate.data).success;
}

function snapshotVersionKey(snapshot: TourStructureSnapshot): string {
  return `${snapshot.source}:${snapshot.version}`;
}

function snapshotKey(snapshot: TourStructureSnapshot): string {
  return `${snapshotVersionKey(snapshot)}:${getTourStructureDataSignature(snapshot.data)}`;
}

export function useTourStructure(initial: TourStructureSnapshot, live = true): TourStructureSnapshot {
  const [snapshot, setSnapshot] = useState(initial);
  const versionRef = useRef(snapshotVersionKey(initial));
  const signatureRef = useRef(snapshotKey(initial));
  const requestRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(() => {
    if (requestRef.current) return requestRef.current;
    const request = fetch('/api/tour-structure', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(async (response) => {
        if (!response.ok) return;
        const value: unknown = await response.json();
        if (!isSnapshot(value)) return;
        const key = snapshotKey(value);
        if (key === signatureRef.current) return;
        versionRef.current = snapshotVersionKey(value);
        signatureRef.current = key;
        setSnapshot(value);
      })
      .catch(() => undefined)
      .finally(() => { requestRef.current = null; });
    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    const nextKey = snapshotKey(initial);
    if (nextKey === signatureRef.current) return;
    versionRef.current = snapshotVersionKey(initial);
    signatureRef.current = nextKey;
    setSnapshot(initial);
  }, [initial]);

  useEffect(() => live ? subscribeContentUpdates((message) => {
    if (message.scope === 'public' && message.kind === 'tour') void refresh();
  }) : () => undefined, [live, refresh]);

  useEffect(() => {
    const check = (): void => {
      if (document.visibilityState !== 'visible') return;
      void fetch('/api/tour-structure', {
        method: 'HEAD',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then((response) => {
          const version = Number(response.headers.get('X-Tour-Structure-Version'));
          const source = response.headers.get('X-Tour-Structure-Source') ?? 'fallback';
          const signature = response.headers.get('X-Tour-Structure-Signature');
          if (!response.ok || !Number.isFinite(version)) return;
          const versionKey = `${source}:${version}`;
          const remoteKey = signature ? `${versionKey}:${signature}` : null;
          if ((remoteKey && remoteKey !== signatureRef.current) || (!remoteKey && versionKey !== versionRef.current)) {
            void refresh();
          }
        })
        .catch(() => undefined);
    };
    if (!live) return;
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    const interval = window.setInterval(check, 15_000);
    check();
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(interval);
    };
  }, [live, refresh]);

  return snapshot;
}
