import { existsSync, readFileSync } from 'node:fs';
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
import {
  ARROW_SETTLE_DURATION,
  ARROW_TRANSITION_ZOOM,
  SCENE_TRANSITION_DURATION,
  getSceneTransitionOptions
} from './viewer-transition';

function readJpegDimensions(filePath: string): { width: number; height: number } {
  const data = readFileSync(filePath);
  let offset = 2;
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

  while (offset < data.length - 9) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    if (marker === undefined) break;
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const blockLength = data.readUInt16BE(offset);
    if (startOfFrameMarkers.has(marker)) {
      return {
        height: data.readUInt16BE(offset + 3),
        width: data.readUInt16BE(offset + 5)
      };
    }
    offset += blockLength;
  }

  throw new Error(`Could not read JPEG dimensions: ${filePath}`);
}

describe('tour configuration', () => {
  it('passes all runtime validation rules', () => {
    expect(validateTour()).toEqual([]);
  });

  it('keeps scene ids unique and in the intended order', () => {
    expect(tourScenes).toHaveLength(25);
    expect(tourScenes.map((scene) => scene.id)).toEqual(sceneIds);
    expect(new Set(sceneIds).size).toBe(sceneIds.length);
  });

  it('keeps the new temp3 route reciprocal', () => {
    const route = [
      'campusBuilding3',
      'campusRoad8',
      'campusRoad9',
      'campusRoad10',
      'campusRoad11',
      'campusRoad12',
      'campusRoad13',
      'campusRoad14',
      'campusRoad15',
      'campusRoad16',
      'campusRoad17'
    ] as const;

    for (let index = 0; index < route.length - 1; index += 1) {
      const from = route[index]!;
      const to = route[index + 1]!;
      expect(getNavigationHotspots(getScene(from)).map((item) => item.target)).toContain(to);
      expect(getNavigationHotspots(getScene(to)).map((item) => item.target)).toContain(from);
    }
  });

  it('derives the route map from the scene graph without invented edges', () => {
    const edges = getSceneEdges().map(({ from, to }) => [from, to].sort().join(':')).sort();
    expect(edges).toEqual([
      'campusRoad1:memorialPlaza',
      'campusRoad1:vallayaHotel',
      'campusRoad1:campusRoad2',
      'campusRoad2:vallayaHotel',
      'campusRoad2:campusRoad3',
      'campusBuilding1:campusRoad3',
      'campusRoad3:campusRoad4',
      'campusBuilding1:campusBuilding2',
      'campusBuilding1:campusRoad4',
      'campusBuilding2:campusRoad4',
      'campusBuilding2:campusRoad5',
      'campusRoad4:campusRoad5',
      'campusRoad5:campusRoad6',
      'campusRoad6:campusRoad7',
      'campusBuilding3:campusRoad7',
      'campusBuilding3:campusRoad8',
      'campusRoad8:campusRoad9',
      'campusRoad10:campusRoad9',
      'campusRoad10:campusRoad11',
      'campusRoad11:campusRoad12',
      'campusRoad12:campusRoad13',
      'campusRoad13:campusRoad14',
      'campusRoad14:campusRoad15',
      'campusRoad15:campusRoad16',
      'campusRoad16:campusRoad17',
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

  it('uses all ten full-resolution temp3 panoramas in order', () => {
    const expectedFiles = Array.from({ length: 10 }, (_, index) => `temp3-${index + 1}.jpg`);
    const newScenes = tourScenes.slice(-10);

    expect(newScenes.map((scene) => scene.panorama)).toEqual(expectedFiles.map((file) => `/mainimages/${file}`));
    for (const file of expectedFiles) {
      const filePath = resolve(process.cwd(), 'public/mainimages', file);
      expect(readJpegDimensions(filePath), file).toEqual({ width: 7680, height: 3840 });
    }
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

  it('returns only the 25 source panoramas from the tour assets API', async () => {
    const response = getTourAssets();
    const body = await response.json() as { assets: string[] };
    expect(body.assets).toEqual(tourScenes.map((scene) => scene.panorama));
    expect(new Set(body.assets).size).toBe(25);
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

describe('viewer scene transitions', () => {
  it('zooms and rotates only when navigation comes from an arrow', () => {
    expect(getSceneTransitionOptions(true, false)).toEqual({
      showLoader: false,
      effect: 'fade',
      speed: SCENE_TRANSITION_DURATION,
      rotation: true,
      zoomTo: ARROW_TRANSITION_ZOOM
    });
    expect(getSceneTransitionOptions(false, false)).toEqual({
      showLoader: false,
      effect: 'fade',
      speed: SCENE_TRANSITION_DURATION,
      rotation: false
    });
    expect(ARROW_SETTLE_DURATION).toBe(450);
  });

  it('disables animated transitions when reduced motion is enabled', () => {
    expect(getSceneTransitionOptions(true, true)).toEqual({
      showLoader: false,
      effect: 'none',
      speed: 0,
      rotation: false
    });
  });
});

describe('translations', () => {
  it('has exactly the same message keys in Thai and English', () => {
    expect(Object.keys(messages.th).sort()).toEqual(Object.keys(messages.en).sort());
  });
});
