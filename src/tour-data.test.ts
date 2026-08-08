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

function publicAssetPath(assetUrl: string): string {
  const pathname = new URL(assetUrl, 'https://tour.local').pathname;
  return resolve(process.cwd(), 'public', pathname.slice(1));
}

describe('tour configuration', () => {
  it('passes all runtime validation rules', () => {
    expect(validateTour()).toEqual([]);
  });

  it('keeps scene ids unique and in the intended order', () => {
    expect(tourScenes).toHaveLength(34);
    expect(tourScenes.map((scene) => scene.id)).toEqual(sceneIds);
    expect(new Set(sceneIds).size).toBe(sceneIds.length);
  });

  it('keeps the temp3 sequence reciprocal and preserves its current entry loop', () => {
    const route = [
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

    expect(getNavigationHotspots(getScene('campusRoad7')).map((item) => item.target)).toContain('campusRoad8');
    expect(getNavigationHotspots(getScene('campusRoad8')).map((item) => item.target)).toContain('campusBuilding3');
    expect(getNavigationHotspots(getScene('campusBuilding3')).map((item) => item.target)).toContain('campusRoad7');
  });

  it('adds a reciprocal temp4 branch at campus road point 15 without replacing the existing route', () => {
    const branch = [
      'campusRoad15',
      'campusRoad18',
      'campusRoad19',
      'campusRoad20',
      'campusRoad21',
      'campusRoad22'
    ] as const;

    for (let index = 0; index < branch.length - 1; index += 1) {
      const from = branch[index]!;
      const to = branch[index + 1]!;
      expect(getNavigationHotspots(getScene(from)).map((item) => item.target)).toContain(to);
      expect(getNavigationHotspots(getScene(to)).map((item) => item.target)).toContain(from);
    }

    expect(getNavigationHotspots(getScene('campusRoad15')).map((item) => item.target)).toContain('campusRoad16');
    expect(getNavigationHotspots(getScene('campusRoad16')).map((item) => item.target)).toContain('campusRoad17');

    const expectedAngles = {
      'campus-road-15-to-road-18': { yaw: 0, pitch: -3 },
      'campus-road-18-to-road-15': { yaw: 180, pitch: -3 },
      'campus-road-18-to-road-19': { yaw: 0, pitch: -3 },
      'campus-road-19-to-road-18': { yaw: -90, pitch: -3 },
      'campus-road-19-to-road-20': { yaw: 90, pitch: -3 },
      'campus-road-20-to-road-19': { yaw: 30, pitch: -3 },
      'campus-road-20-to-road-21': { yaw: -200, pitch: 0 },
      'campus-road-21-to-road-20': { yaw: -90, pitch: -3 },
      'campus-road-21-to-road-22': { yaw: 90, pitch: -3 },
      'campus-road-22-to-road-21': { yaw: 180, pitch: -3 }
    } as const;

    for (const sceneId of branch) {
      for (const hotspot of getNavigationHotspots(getScene(sceneId))) {
        if (hotspot.id in expectedAngles) {
          const expected = expectedAngles[hotspot.id as keyof typeof expectedAngles];
          expect({ yaw: hotspot.yaw, pitch: hotspot.pitch }).toEqual(expected);
        }
      }
    }
  });

  it('adds the reciprocal temp5 route between campus road points 16 and 22', () => {
    const route = [
      'campusRoad16',
      'campusRoad23',
      'campusRoad24',
      'campusRoad25',
      'campusRoad26',
      'campusRoad22'
    ] as const;

    for (let index = 0; index < route.length - 1; index += 1) {
      const from = route[index]!;
      const to = route[index + 1]!;
      expect(getNavigationHotspots(getScene(from)).map((item) => item.target)).toContain(to);
      expect(getNavigationHotspots(getScene(to)).map((item) => item.target)).toContain(from);
    }

    expect(getNavigationHotspots(getScene('campusRoad16')).map((item) => item.target)).toContain('campusRoad17');
    expect(getNavigationHotspots(getScene('campusRoad22')).map((item) => item.target)).toContain('campusRoad21');

    const expectedAngles = {
      'campus-road-16-to-road-23': { yaw: 0, pitch: -3 },
      'campus-road-23-to-road-16': { yaw: 180, pitch: -3 },
      'campus-road-23-to-road-24': { yaw: 0, pitch: -3 },
      'campus-road-24-to-road-23': { yaw: 180, pitch: -3 },
      'campus-road-24-to-road-25': { yaw: 0, pitch: -3 },
      'campus-road-25-to-road-24': { yaw: 150, pitch: -3 },
      'campus-road-25-to-road-26': { yaw: -50, pitch: -3 },
      'campus-road-26-to-road-25': { yaw: 85, pitch: -3 },
      'campus-road-26-to-road-22': { yaw: -90, pitch: -3 },
      'campus-road-22-to-road-26': { yaw: 90, pitch: -3 }
    } as const;

    for (const sceneId of route) {
      for (const hotspot of getNavigationHotspots(getScene(sceneId))) {
        if (hotspot.id in expectedAngles) {
          const expected = expectedAngles[hotspot.id as keyof typeof expectedAngles];
          expect({ yaw: hotspot.yaw, pitch: hotspot.pitch }).toEqual(expected);
        }
      }
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
      'campusRoad7:campusRoad8',
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
      'campusRoad15:campusRoad18',
      'campusRoad16:campusRoad17',
      'campusRoad16:campusRoad23',
      'campusRoad18:campusRoad19',
      'campusRoad19:campusRoad20',
      'campusRoad20:campusRoad21',
      'campusRoad21:campusRoad22',
      'campusRoad22:campusRoad26',
      'campusRoad23:campusRoad24',
      'campusRoad24:campusRoad25',
      'campusRoad25:campusRoad26',
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
        existsSync(publicAssetPath(scene.panorama)),
        `${scene.id} references a missing source file: ${scene.panorama}`
      ).toBe(true);
      expect(getSceneAssetUrls(scene)).toEqual([scene.panorama]);
    }
    expect(existsSync(resolve(process.cwd(), 'public', tourMap.image.slice(1)))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'public/mainimages/tiles'))).toBe(false);
  });

  it('uses all ten full-resolution temp3 panoramas in order', () => {
    const expectedFiles = Array.from({ length: 10 }, (_, index) => `temp3-${index + 1}.jpg`);
    const temp3Scenes = Array.from({ length: 10 }, (_, index) => getScene(`campusRoad${index + 8}` as Parameters<typeof getScene>[0]));

    expect(temp3Scenes.map((scene) => new URL(scene.panorama, 'https://tour.local').pathname))
      .toEqual(expectedFiles.map((file) => `/mainimages/${file}`));
    for (const file of expectedFiles) {
      const filePath = resolve(process.cwd(), 'public/mainimages', file);
      expect(readJpegDimensions(filePath), file).toEqual({ width: 7680, height: 3840 });
    }
  });

  it('uses all five full-resolution temp4 panoramas and the configured map positions', () => {
    const sceneIds = ['campusRoad18', 'campusRoad19', 'campusRoad20', 'campusRoad21', 'campusRoad22'] as const;
    const expectedFiles = ['temp4-2.jpg', 'temp4-3.jpg', 'temp4-4.jpg', 'temp4-5.jpg', 'temp4-6.jpg'];
    const expectedPositions = [
      { x: 411, y: 449 },
      { x: 388, y: 430 },
      { x: 373, y: 418 },
      { x: 352, y: 401 },
      { x: 250, y: 422 }
    ];

    const scenes = sceneIds.map((sceneId) => getScene(sceneId));
    expect(scenes.map((scene) => new URL(scene.panorama, 'https://tour.local').pathname))
      .toEqual(expectedFiles.map((file) => `/mainimages/${file}`));
    expect(scenes.map((scene) => scene.mapPosition)).toEqual(expectedPositions);

    for (const file of expectedFiles) {
      expect(readJpegDimensions(resolve(process.cwd(), 'public/mainimages', file)), file)
        .toEqual({ width: 7680, height: 3840 });
    }
  });

  it('uses all four full-resolution temp5 panoramas with their map positions and information points', () => {
    const ids = ['campusRoad23', 'campusRoad24', 'campusRoad25', 'campusRoad26'] as const;
    const expectedFiles = ['temp5-1.jpg', 'temp5-2.jpg', 'temp5-3.jpg', 'temp5-4.jpg'];
    const expectedPositions = [
      { x: 331, y: 324 },
      { x: 311, y: 348 },
      { x: 291, y: 373 },
      { x: 270, y: 398 }
    ];
    const expectedInfo = [
      { title: 'หอพระหลวงพ่อสิง', yaw: 98, pitch: 4, images: 1 },
      { title: 'ที่จอดรถยนต์ในคณะเทคโนโลยี', yaw: 108, pitch: 2, images: 1 },
      { title: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี', yaw: 30, pitch: 1, images: 2 },
      { title: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี', yaw: 0, pitch: 2, images: 2 }
    ];

    const scenes = ids.map((sceneId) => getScene(sceneId));
    expect(scenes.map((scene) => new URL(scene.panorama, 'https://tour.local').pathname))
      .toEqual(expectedFiles.map((file) => `/mainimages/${file}`));
    expect(scenes.map((scene) => scene.mapPosition)).toEqual(expectedPositions);

    scenes.forEach((scene, index) => {
      const info = getInfoHotspots(scene);
      expect(info).toHaveLength(1);
      expect({
        title: info[0]!.title!.th,
        yaw: info[0]!.yaw,
        pitch: info[0]!.pitch,
        images: info[0]!.images?.length
      }).toEqual(expectedInfo[index]);
    });

    for (const file of expectedFiles) {
      expect(readJpegDimensions(resolve(process.cwd(), 'public/mainimages', file)), file)
        .toEqual({ width: 7680, height: 3840 });
    }
  });

  it('provides at least one clickable source image and supports multi-image information galleries', () => {
    for (const scene of tourScenes) {
      for (const hotspot of getInfoHotspots(scene)) {
        expect(hotspot.images?.length, `${hotspot.id} needs an image`).toBeGreaterThanOrEqual(1);
        for (const image of hotspot.images ?? []) {
          expect(image.src).toMatch(/^\/mainimages\//);
          expect(image.src).not.toMatch(/^\/tour\/(?:pano|thumbs)\//);
          expect(existsSync(publicAssetPath(image.src)), `${image.src} is missing`).toBe(true);
          for (const locale of locales) {
            expect(image.alt[locale].trim()).not.toBe('');
            if (image.caption) expect(image.caption[locale].trim()).not.toBe('');
          }
        }
      }
    }

    expect(getInfoHotspots(getScene('campusRoad25'))[0]!.images).toHaveLength(2);
    expect(getInfoHotspots(getScene('campusRoad26'))[0]!.images).toHaveLength(2);
  });

  it('includes the temporary Wikipedia reference in all thirteen information hotspots', () => {
    const infoHotspots = tourScenes.flatMap((scene) => getInfoHotspots(scene));

    expect(infoHotspots).toHaveLength(13);
    for (const hotspot of infoHotspots) {
      expect(hotspot.reference).toEqual({
        label: { th: 'วิกิพีเดีย', en: 'Wikipedia' }
      });
      for (const locale of locales) {
        expect(hotspot.reference!.label[locale].trim()).not.toBe('');
      }
    }
  });

  it('returns only the 34 versioned source panoramas from the tour assets API', async () => {
    const response = getTourAssets();
    const body = await response.json() as { assets: string[] };
    expect(body.assets).toEqual(tourScenes.map((scene) => scene.panorama));
    expect(new Set(body.assets).size).toBe(34);
    expect(body.assets.every((asset) => asset.endsWith('?v=20260805-redacted'))).toBe(true);
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
