'use client';

import { useEffect, useState } from 'react';
import type { NavigationPositionPreview } from '../TourViewer';
import { getNavigationHotspots, getScene, type SceneId } from '../../src/tour-data';

export default function useDevelopmentArrowPreview(sceneId: SceneId, navigationSignature: string) {
  const [open, setOpen] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>();
  const [preview, setPreview] = useState<NavigationPositionPreview | null>(null);

  useEffect(() => {
    const arrows = getNavigationHotspots(getScene(sceneId));
    setPreview(null);
    setSelectedHotspotId((current) => current && arrows.some((hotspot) => hotspot.id === current) ? current : arrows[0]?.id);
  }, [navigationSignature, sceneId]);

  return {
    open,
    selectedHotspotId,
    preview,
    setSelectedHotspotId,
    setPreview,
    openTool: () => setOpen(true),
    closeTool: () => {
      setOpen(false);
      setPreview(null);
    }
  };
}
