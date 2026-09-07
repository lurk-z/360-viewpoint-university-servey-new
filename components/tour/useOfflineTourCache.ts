'use client';

import { useEffect } from 'react';
import { getScene, getSceneAssetUrls, type SceneId } from '../../src/tour-data';

export default function useOfflineTourCache() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  return (sceneId: SceneId): void => {
    if (process.env.NODE_ENV === 'development' || !('serviceWorker' in navigator)) return;
    const assets = getSceneAssetUrls(getScene(sceneId));
    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: 'CACHE_SCENE_ASSETS', sceneId, assets });
    }).catch(() => undefined);
  };
}
