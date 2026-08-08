import type { MapPosition, SceneId, TourScene } from './tour-data';

export function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) throw new Error(`Invalid angle: ${value}`);
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/** Returns a clockwise bearing where the top of the map is 0 degrees. */
export function getMapBearing(from: MapPosition, to: MapPosition): number {
  return normalizeDegrees(Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI);
}

/**
 * Converts the panorama's yaw axis to the map axis. An explicit scene offset wins;
 * otherwise the first usable navigation arrow is aligned with its target marker.
 */
export function getSceneMapHeadingOffset(
  scene: TourScene,
  findScene: (sceneId: SceneId) => TourScene | undefined
): number {
  if (scene.mapHeadingOffset !== undefined) return normalizeDegrees(scene.mapHeadingOffset);

  const link = scene.hotspots.find((hotspot) => {
    if (hotspot.type !== 'scene') return false;
    const target = findScene(hotspot.target);
    return Boolean(target && (target.mapPosition.x !== scene.mapPosition.x || target.mapPosition.y !== scene.mapPosition.y));
  });
  if (!link || link.type !== 'scene') return 0;
  const target = findScene(link.target);
  if (!target) return 0;
  return normalizeDegrees(getMapBearing(scene.mapPosition, target.mapPosition) - link.yaw);
}

export function getMapViewHeading(viewerYaw: number, mapHeadingOffset: number): number {
  return normalizeDegrees(viewerYaw + mapHeadingOffset);
}
