import type { VirtualTourLink, VirtualTourNode } from '@photo-sphere-viewer/virtual-tour-plugin';
import {
  getNavigationHotspots,
  toDegrees,
  tourScenes,
  type TourScene
} from '../../../src/tour-data';
import type { NavigationPositionPreview } from './types';

export function buildSceneLinks(
  scene: TourScene,
  preview?: NavigationPositionPreview | null
): VirtualTourLink[] {
  return getNavigationHotspots(scene).map((hotspot) => ({
    nodeId: hotspot.target,
    position: {
      yaw: toDegrees(preview?.hotspotId === hotspot.id ? preview.yaw : hotspot.yaw),
      pitch: toDegrees(preview?.hotspotId === hotspot.id ? preview.pitch : hotspot.pitch)
    },
    data: { hotspotId: hotspot.id, direction: hotspot.direction ?? 'standard' }
  }));
}

export function getSceneNavigationSignature(
  scene: TourScene,
  preview?: NavigationPositionPreview | null
): string {
  return JSON.stringify(buildSceneLinks(scene, preview));
}

export function buildTourNodes(preview?: NavigationPositionPreview | null): VirtualTourNode[] {
  return tourScenes.map((scene) => ({
    id: scene.id,
    panorama: scene.panorama,
    name: `${scene.title.th} · ${scene.title.en}`,
    data: { sceneId: scene.id },
    links: buildSceneLinks(scene, preview)
  }));
}
