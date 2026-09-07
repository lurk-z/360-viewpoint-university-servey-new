'use client';

import { useEffect, type RefObject } from 'react';
import type { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { tourScenes } from '../../../src/tour-data';
import type { NavigationPositionPreview } from './types';
import { buildSceneLinks, getSceneNavigationSignature } from './viewer-nodes';

export default function useNavigationHotReload({
  pluginRef,
  sceneSignaturesRef,
  navigationSignature,
  navigationPreview
}: {
  readonly pluginRef: RefObject<VirtualTourPlugin | null>;
  readonly sceneSignaturesRef: RefObject<Map<string, string>>;
  readonly navigationSignature: string;
  readonly navigationPreview?: NavigationPositionPreview | null;
}) {
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin) return;
    const previous = sceneSignaturesRef.current;
    const applied = new Map(previous);
    for (const scene of tourScenes) {
      const nextSignature = getSceneNavigationSignature(scene, navigationPreview);
      if (previous.get(scene.id) === nextSignature) continue;
      try {
        plugin.updateNode({ id: scene.id, links: buildSceneLinks(scene, navigationPreview) });
        applied.set(scene.id, nextSignature);
      } catch {
        // Keep the last valid links visible while a development edit is incomplete.
      }
    }
    sceneSignaturesRef.current = applied;
  }, [navigationPreview, navigationSignature, pluginRef, sceneSignaturesRef]);
}
