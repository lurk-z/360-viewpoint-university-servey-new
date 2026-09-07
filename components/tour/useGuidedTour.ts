'use client';

import { useEffect, useState } from 'react';
import type { TourPlan } from '../../src/chat';
import { resolveTourScene, type PublicContentSnapshot } from '../../src/content';
import { buildMultiStopTourPath, findShortestTourPath } from '../../src/tour-routing';
import { getScene, localize, type Locale, type SceneId } from '../../src/tour-data';

export interface GuidedTourState extends TourPlan {
  readonly currentIndex: number;
}

export function useGuidedTour({
  activeSceneId,
  locale,
  content,
  announce
}: {
  readonly activeSceneId: SceneId;
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly announce: (text: string) => void;
}) {
  const [guidedTour, setGuidedTour] = useState<GuidedTourState | null>(null);

  useEffect(() => {
    setGuidedTour((current) => {
      if (!current) return null;
      const currentIndex = current.sceneIds.indexOf(activeSceneId);
      if (currentIndex >= 0) return currentIndex === current.currentIndex ? current : { ...current, currentIndex };
      const remainingStops = current.stopSceneIds.filter((stopSceneId) => current.sceneIds.indexOf(stopSceneId) > current.currentIndex);
      const recalculated = buildMultiStopTourPath(activeSceneId, remainingStops.length ? remainingStops : [current.destinationSceneId]);
      return recalculated ? {
        destinationSceneId: recalculated.stopSceneIds.at(-1) ?? current.destinationSceneId,
        stopSceneIds: recalculated.stopSceneIds,
        sceneIds: recalculated.sceneIds,
        currentIndex: 0
      } : null;
    });
  }, [activeSceneId]);

  const start = (plan: TourPlan): void => {
    const route = buildMultiStopTourPath(activeSceneId, plan.stopSceneIds);
    if (!route) return;
    setGuidedTour({
      destinationSceneId: route.stopSceneIds.at(-1) ?? plan.destinationSceneId,
      stopSceneIds: route.stopSceneIds,
      sceneIds: route.sceneIds,
      currentIndex: 0
    });
    const destination = localize(resolveTourScene(getScene(plan.destinationSceneId), content).title, locale);
    announce(locale === 'th' ? `เริ่มพาทัวร์ไป ${destination}` : `Guided tour started to ${destination}`);
  };

  const startTo = (destinationSceneId: SceneId): void => {
    const sceneIds = findShortestTourPath(activeSceneId, destinationSceneId);
    if (sceneIds) start({ destinationSceneId, stopSceneIds: [destinationSceneId], sceneIds });
  };

  return {
    guidedTour,
    startGuidedTour: start,
    startGuidedTourTo: startTo,
    cancelGuidedTour: () => setGuidedTour(null)
  } as const;
}
