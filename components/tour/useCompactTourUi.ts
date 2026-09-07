'use client';

import { useSyncExternalStore } from 'react';

const COMPACT_TOUR_QUERY = '(max-width: 1024px)';

function subscribe(callback: () => void): () => void {
  const media = window.matchMedia(COMPACT_TOUR_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function useCompactTourUi(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT_TOUR_QUERY).matches,
    () => false
  );
}
