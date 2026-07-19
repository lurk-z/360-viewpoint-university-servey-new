import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET as getTourAssets } from '../app/api/tour-assets/route';
import { messages } from './i18n';
import {
  getInfoHotspots,
  getNavigationHotspots,
  getScene,
  getSceneAssetUrls,
  getSceneEdges,
  locales,
  sceneIds,
  toDegrees,
  tourMap,
  tourScenes,
  validateTour
} from './tour-data';

describe('tour configuration', () => {
  it('passes all runtime validation rules', () => {
    expect(validateTour()).toEqual([]);
  });

  it('keeps scene ids unique and in the intended order', () => {
    expect(tourScenes).toHaveLength(15);
    expect(tourScenes.map((scene) => scene.id)).toEqual(sceneIds);
    expect(new Set(sceneIds).size).toBe(sceneIds.length);
  });

  it('keeps every navigation link reciprocal', () => {
    for (const scene of tourScenes) {
      for (const link of getNavigationHotspots(scene)) {
        const reverseTargets = getNavigationHotspots(getScene(link.target)).map((item) => item.target);
        expect(reverseTargets, `${scene.id} -> ${link.target} is missing its return path`).toContain(scene.id);
      }
    }
  });

  it('derives the route map from the scene graph without invented edges', () => {
    const edges = getSceneEdges().map(({ from, to }) => [from, to].sort().join(':')).sort();
    expect(edges).toEqual([
      'campusRoad1:memorialPlaza',
      'campusRoad1:vallayaHotel',
      'campusRoad1:campusRoad2',
      'campusRoad2:campusRoad3',
      'campusRoad3:campusRoad4',
      'campusBuilding1:campusRoad4',
      'campusBuilding2:campusRoad4',
      'campusRoad4:campusRoad5',
      'campusRoad5:campusRoad6',
      'campusRoad6:campusRoad7',
      'campusBuilding3:campusRoad7',
      'entrance:entranceRoad',
      'entranceRoad:memorialPlaza',
      'memorial:memorialPlaza'
    ].sort());
  });

  it('references one existing source panorama per scene from mainimages', () => {
    for (const scene of tourScenes) {
      expect(scene.panorama, `${scene.id} must use mainimages`).toMatch(/^\/mainimages\//);
      expect(scene.panorama).not.toMatch(/\/(?:tiles|tour\/pano|tour\/thumbs)\//);
      expect('thumbnail' in scene).toBe(false);
      expect('sourcePanorama' in scene).toBe(false);
      expect('tiledPanorama' in scene).toBe(false);
      expect(
        existsSync(resolve(process.cwd(), 'public', scene.panorama.slice(1))),
        `${scene.id} references a missing source file: ${scene.panorama}`
      ).toBe(true);
      expect(getSceneAssetUrls(scene)).toEqual([scene.panorama]);
    }
    expect(existsSync(resolve(process.cwd(), 'public', tourMap.image.slice(1)))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'public/mainimages/tiles'))).toBe(false);
  });

  it('supports multiple localized images in every information hotspot', () => {
    for (const scene of tourScenes) {
      for (const hotspot of getInfoHotspots(scene)) {
        expect(hotspot.images?.length, `${hotspot.id} needs a multi-image gallery`).toBeGreaterThanOrEqual(2);
        for (const image of hotspot.images ?? []) {
          expect(image.src).toMatch(/^\/mainimages\//);
          expect(image.src).not.toMatch(/^\/tour\/(?:pano|thumbs)\//);
          expect(existsSync(resolve(process.cwd(), 'public', image.src.slice(1))), `${image.src} is missing`).toBe(true);
          for (const locale of locales) {
            expect(image.alt[locale].trim()).not.toBe('');
            if (image.caption) expect(image.caption[locale].trim()).not.toBe('');
          }
        }
      }
    }
  });

  it('returns only the 15 source panoramas from the tour assets API', async () => {
    const response = getTourAssets();
    const body = await response.json() as { assets: string[] };
    expect(body.assets).toEqual(tourScenes.map((scene) => scene.panorama));
    expect(new Set(body.assets).size).toBe(15);
    expect(body.assets.every((asset) => !asset.includes('/tiles/'))).toBe(true);
  });

  it('keeps map positions and hotspot angles within supported ranges', () => {
    for (const scene of tourScenes) {
      expect(scene.mapPosition.x).toBeGreaterThanOrEqual(0);
      expect(scene.mapPosition.x).toBeLessThanOrEqual(tourMap.width);
      expect(scene.mapPosition.y).toBeGreaterThanOrEqual(0);
      expect(scene.mapPosition.y).toBeLessThanOrEqual(tourMap.height);
      for (const hotspot of scene.hotspots) {
        expect(Number.isFinite(hotspot.yaw)).toBe(true);
        expect(hotspot.pitch).toBeGreaterThanOrEqual(-90);
        expect(hotspot.pitch).toBeLessThanOrEqual(90);
      }
    }
  });

  it('formats configured angles as degrees for Photo Sphere Viewer', () => {
    expect(toDegrees(100)).toBe('100deg');
    expect(toDegrees(-30)).toBe('-30deg');
    expect(toDegrees(4)).toBe('4deg');
    expect(toDegrees(-0)).toBe('0deg');
    expect(() => toDegrees(Number.NaN)).toThrow('Invalid angle');
  });

  it('contains complete localized scene content', () => {
    for (const scene of tourScenes) {
      for (const locale of locales) {
        expect(scene.title[locale].trim()).not.toBe('');
        expect(scene.description[locale].trim()).not.toBe('');
        expect(scene.tags[locale].length).toBeGreaterThan(0);
      }
    }
  });
});

describe('translations', () => {
  it('has exactly the same message keys in Thai and English', () => {
    expect(Object.keys(messages.th).sort()).toEqual(Object.keys(messages.en).sort());
  });
});
