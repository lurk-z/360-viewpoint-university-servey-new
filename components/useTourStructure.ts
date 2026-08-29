'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeContentUpdates } from '../src/content-updates';
import {
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

export function useTourStructure(initial: TourStructureSnapshot, live = true): TourStructureSnapshot {
  const [snapshot, setSnapshot] = useState(initial);
  const versionRef = useRef(`${initial.source}:${initial.version}`);
  const requestRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(() => {
    if (requestRef.current) return requestRef.current;
    const request = fetch('/api/tour-structure', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const value: unknown = await response.json();
        const key = isSnapshot(value) ? `${value.source}:${value.version}` : '';
        if (!isSnapshot(value) || key === versionRef.current) return;
        versionRef.current = key;
        setSnapshot(value);
      })
      .catch(() => undefined)
      .finally(() => { requestRef.current = null; });
    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => live ? subscribeContentUpdates((message) => {
    if (message.scope === 'public' && message.kind === 'tour') void refresh();
  }) : () => undefined, [live, refresh]);

  useEffect(() => {
    const check = (): void => {
      if (document.visibilityState !== 'visible') return;
      void fetch('/api/tour-structure', { method: 'HEAD', cache: 'no-store' })
        .then((response) => {
          const version = Number(response.headers.get('X-Tour-Structure-Version'));
          const source = response.headers.get('X-Tour-Structure-Source') ?? 'fallback';
          if (response.ok && Number.isFinite(version) && `${source}:${version}` !== versionRef.current) void refresh();
        })
        .catch(() => undefined);
    };
    if (!live) return;
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [live, refresh]);

  return snapshot;
}
