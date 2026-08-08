import { describe, expect, it } from 'vitest';
import { getMapBearing, getMapViewHeading, getSceneMapHeadingOffset, normalizeDegrees } from './map-heading';
import { getScene } from './tour-data';

describe('map heading', () => {
  it('normalizes angles and uses the top of the image as north', () => {
    expect(normalizeDegrees(-30)).toBe(330);
    expect(normalizeDegrees(390)).toBe(30);
    expect(getMapBearing({ x: 10, y: 10 }, { x: 10, y: 0 })).toBe(0);
    expect(getMapBearing({ x: 10, y: 10 }, { x: 20, y: 10 })).toBe(90);
    expect(getMapBearing({ x: 10, y: 10 }, { x: 10, y: 20 })).toBe(180);
  });

  it('aligns the first navigation arrow with its target marker', () => {
    const scene = getScene('entrance');
    const offset = getSceneMapHeadingOffset(scene, (id) => getScene(id));
    const firstLink = scene.hotspots.find((item) => item.type === 'scene');
    expect(firstLink?.type).toBe('scene');
    if (!firstLink || firstLink.type !== 'scene') return;
    const target = getScene(firstLink.target);
    expect(getMapViewHeading(firstLink.yaw, offset)).toBeCloseTo(
      getMapBearing(scene.mapPosition, target.mapPosition),
      5
    );
  });

  it('uses an explicit per-scene offset when one is supplied', () => {
    const scene = { ...getScene('entrance'), mapHeadingOffset: -45 };
    expect(getSceneMapHeadingOffset(scene, (id) => getScene(id))).toBe(315);
    expect(getMapViewHeading(90, 315)).toBe(45);
  });
});
