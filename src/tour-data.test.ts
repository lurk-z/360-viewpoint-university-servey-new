import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET as getTourAssets } from '../app/api/tour-assets/route';
import { placeContentBootstrap } from '../scripts/place-seed-data';
import { hotspotDataSchema } from './content';
import { messages } from './i18n';
import {
  getInfoHotspots,
  getMapLandmarkScenes,
  getNavigationHotspots,
  getScene,
  getSceneAssetUrls,
  getSceneEdges,
  getTourStructureSignature,
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

function readPngDimensions(filePath: string): { width: number; height: number } {
  const data = readFileSync(filePath);
  expect(data.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
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
    expect(tourScenes).toHaveLength(93);
    expect(tourScenes.map((scene) => scene.id)).toEqual(sceneIds);
    expect(new Set(sceneIds).size).toBe(sceneIds.length);
  });

  it('shows the configured major campus landmarks on the map', () => {
    expect(getMapLandmarkScenes().map((scene) => scene.id)).toEqual([
      'entrance',
      'memorial',
      'vallayaHotel',
      'campusBuilding1',
      'campusBuilding2',
      'campusBuilding3',
      'campusRoad19',
      'campusRoad21',
      'campusRoad22',
      'campusRoad23',
      'campusRoad36',
      'universityCafeteria',
      'campusRoad43',
      'multipurposeGym',
      'maleDormitory',
      'femaleDormitory1',
      'femaleDormitory2'
    ]);
    expect(getMapLandmarkScenes().every((scene) => scene.mapLandmark)).toBe(true);
  });

  it('includes viewer geometry in the Fast Refresh structure signature', () => {
    const signature = getTourStructureSignature();
    const parsed = JSON.parse(signature) as Array<{
      id: string;
      panorama: string;
      initialView: { yaw: number; pitch: number; zoom: number };
      mapPosition: { x: number; y: number };
      mapLandmark?: boolean;
      hotspots: Array<{ id: string; yaw: number; pitch: number; target?: string }>;
    }>;
    expect(parsed).toHaveLength(tourScenes.length);
    expect(parsed[0]).toMatchObject({
      id: 'entrance',
      panorama: getScene('entrance').panorama,
      initialView: getScene('entrance').initialView,
      mapPosition: getScene('entrance').mapPosition,
      mapLandmark: true
    });
    expect(parsed[0]?.hotspots).toContainEqual(expect.objectContaining({
      id: 'entrance-to-road',
      target: 'entranceRoad',
      yaw: -40,
      pitch: -3
    }));
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
      'campusRoad27',
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
      'campus-road-15-to-road-27': { yaw: 0, pitch: -3 },
      'campus-road-27-to-road-15': { yaw: 180, pitch: -3 },
      'campus-road-27-to-road-18': { yaw: 0, pitch: -3 },
      'campus-road-18-to-road-27': { yaw: 100, pitch: 0 },
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
      'campusRoad15:campusRoad27',
      'campusRoad16:campusRoad17',
      'campusRoad16:campusRoad23',
      'campusRoad17:campusRoad28',
      'campusRoad18:campusRoad19',
      'campusRoad18:campusRoad27',
      'campusRoad19:campusRoad20',
      'campusRoad20:campusRoad21',
      'campusRoad21:campusRoad22',
      'campusRoad22:campusRoad26',
      'campusRoad23:campusRoad24',
      'campusRoad24:campusRoad25',
      'campusRoad25:campusRoad26',
      'campusRoad28:campusRoad29',
      'campusRoad29:campusRoad30',
      'campusRoad29:multipurposeGym',
      'campusRoad30:campusRoad31',
      'campusRoad30:campusRoad49',
      'campusRoad31:campusRoad32',
      'campusRoad31:campusRoad38',
      'campusRoad32:campusRoad33',
      'campusRoad32:campusRoad37',
      'campusRoad33:campusRoad34',
      'campusRoad34:campusRoad35',
      'campusRoad35:campusRoad36',
      'campusRoad36:campusRoad37',
      'campusRoad38:campusRoad39',
      'campusRoad38:campusRoad50',
      'campusRoad38:universityCafeteria',
      'campusRoad39:campusRoad40',
      'campusRoad40:campusRoad41',
      'campusRoad41:campusRoad42',
      'campusRoad42:campusRoad43',
      'campusRoad44:campusRoad45',
      'campusRoad44:multipurposeGym',
      'campusRoad45:campusRoad46',
      'campusRoad45:campusRoad47',
      'campusRoad47:campusRoad48',
      'campusRoad48:campusRoad49',
      'campusRoad49:campusRoad50',
      'campusRoad12:campusRoad52',
      'campusRoad25:fitmInterior5',
      'campusRoad34:fitmInterior1',
      'campusRoad36:fitmInterior10',
      'campusRoad46:campusRoad51',
      'campusRoad51:dormitoryJunction',
      'campusRoad52:campusRoad53',
      'campusRoad53:campusRoad54',
      'campusRoad54:campusRoad55',
      'campusRoad55:campusRoad56',
      'campusRoad56:campusRoad57',
      'campusRoad57:campusRoad58',
      'campusRoad58:maleDormitory',
      'dormitoryJunction:femaleDormitory1',
      'dormitoryJunction:maleDormitory',
      'dormitoryRoad:femaleDormitory2',
      'dormitoryRoad:femaleDormitoryMinimart',
      'dormitoryRoad:maleDormitory',
      'femaleDormitory1:femaleDormitoryMinimart',
      'fitmInterior1:fitmInterior2',
      'fitmInterior2:fitmInterior3',
      'fitmInterior2:puangKhrangRoom2',
      'fitmInterior3:fitmInterior4',
      'fitmInterior4:fitmInterior5',
      'fitmInterior4:fitmInterior6',
      'fitmInterior4:puangKhramRoom1',
      'fitmInterior6:fitmInterior7',
      'fitmInterior7:fitmInterior8',
      'fitmInterior12:fitmInterior7',
      'fitmInterior8:fitmInterior9',
      'fitmInterior10:fitmInterior9',
      'fitmInterior10:universityCafeteria',
      'fitmInterior11:fitmInterior12',
      'fitmInterior11:fitmInterior13',
      'fitmInterior11:fitmInterior9',
      'fitmInterior13:fitmInterior14',
      'fitmInterior14:fitmInterior15',
      'fitmInterior15:fitmInterior16',
      'fitmInterior16:fitmInterior17',
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
    const mapPath = resolve(process.cwd(), 'public', tourMap.image.slice(1));
    expect(tourMap).toEqual({ image: '/mainimages/map/mainmap1.png', width: 1096, height: 583 });
    expect(existsSync(mapPath)).toBe(true);
    expect(readPngDimensions(mapPath)).toEqual({ width: 1096, height: 583 });
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

  it('uses all six full-resolution temp4 panoramas and the configured map positions', () => {
    const sceneIds = ['campusRoad27', 'campusRoad18', 'campusRoad19', 'campusRoad20', 'campusRoad21', 'campusRoad22'] as const;
    const expectedFiles = ['temp4-1.jpg', 'temp4-2.jpg', 'temp4-3.jpg', 'temp4-4.jpg', 'temp4-5.jpg', 'temp4-6.jpg'];
    const expectedPositions = [
      { x: 436, y: 379 },
      { x: 450, y: 437 },
      { x: 433, y: 422 },
      { x: 421, y: 413 },
      { x: 405, y: 400 },
      { x: 328, y: 416 }
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

  it('uses all temp6/temp7 panoramas and keeps the faculty junction reciprocal', () => {
    const temp6Ids = ['campusRoad28', 'campusRoad29', 'campusRoad30', 'campusRoad31', 'campusRoad32', 'campusRoad33', 'campusRoad34', 'campusRoad35', 'campusRoad36', 'campusRoad37'] as const;
    const temp7Ids = ['campusRoad38', 'campusRoad39', 'campusRoad40', 'campusRoad41', 'campusRoad42', 'campusRoad43'] as const;
    expect(temp6Ids.map((id) => new URL(getScene(id).panorama, 'https://tour.local').pathname))
      .toEqual(Array.from({ length: 10 }, (_, index) => `/mainimages/temp6-${index + 1}.jpg`));
    expect(temp7Ids.map((id) => new URL(getScene(id).panorama, 'https://tour.local').pathname))
      .toEqual(Array.from({ length: 6 }, (_, index) => `/mainimages/temp7-${index + 1}.jpg`));
    expect(new URL(getScene('universityCafeteria').panorama, 'https://tour.local').pathname)
      .toBe('/mainimages/temp6-University_cafeteria.jpg');

    const checkRoute = (route: readonly Parameters<typeof getScene>[0][]): void => {
      for (let index = 0; index < route.length - 1; index += 1) {
        const from = route[index]!;
        const to = route[index + 1]!;
        expect(getNavigationHotspots(getScene(from)).map((item) => item.target)).toContain(to);
        expect(getNavigationHotspots(getScene(to)).map((item) => item.target)).toContain(from);
      }
    };
    checkRoute(['campusRoad17', ...temp6Ids.slice(0, 4)]);
    checkRoute(['campusRoad31', ...temp6Ids.slice(4)]);
    checkRoute(['campusRoad32', 'campusRoad37']);
    checkRoute(['campusRoad36', 'fitmInterior10', 'universityCafeteria', 'campusRoad38']);
    checkRoute(['campusRoad31', ...temp7Ids]);

    const junction = getNavigationHotspots(getScene('campusRoad31'));
    expect(junction).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'campusRoad30', yaw: 170, pitch: -3 }),
      expect.objectContaining({ target: 'campusRoad32', yaw: -95, pitch: -3 }),
      expect.objectContaining({ target: 'campusRoad38', yaw: 0, pitch: -3 })
    ]));

    for (const file of [
      ...Array.from({ length: 10 }, (_, index) => `temp6-${index + 1}.jpg`),
      'temp6-University_cafeteria.jpg',
      ...Array.from({ length: 6 }, (_, index) => `temp7-${index + 1}.jpg`)
    ]) {
      expect(readJpegDimensions(resolve(process.cwd(), 'public/mainimages', file)), file)
        .toEqual({ width: 7680, height: 3840 });
    }
  });

  it('uses all eight temp9 panoramas with the configured Red Dome route and junctions', () => {
    const ids = [
      'multipurposeGym',
      'campusRoad44',
      'campusRoad45',
      'campusRoad46',
      'campusRoad47',
      'campusRoad48',
      'campusRoad49',
      'campusRoad50'
    ] as const;
    const files = [
      'temp9-1.jpg',
      'temp9-2.jpg',
      'temp9-3.jpg',
      'temp9-3-1.jpg',
      'temp9-4.jpg',
      'temp9-5.jpg',
      'temp9-6.jpg',
      'temp9-7.jpg'
    ];
    expect(ids.map((id) => new URL(getScene(id).panorama, 'https://tour.local').pathname))
      .toEqual(files.map((file) => `/mainimages/${file}`));

    const checkPair = (from: Parameters<typeof getScene>[0], to: Parameters<typeof getScene>[0]): void => {
      expect(getNavigationHotspots(getScene(from)).map((item) => item.target)).toContain(to);
      expect(getNavigationHotspots(getScene(to)).map((item) => item.target)).toContain(from);
    };
    checkPair('campusRoad29', 'multipurposeGym');
    checkPair('multipurposeGym', 'campusRoad44');
    checkPair('campusRoad44', 'campusRoad45');
    checkPair('campusRoad45', 'campusRoad46');
    checkPair('campusRoad45', 'campusRoad47');
    checkPair('campusRoad47', 'campusRoad48');
    checkPair('campusRoad48', 'campusRoad49');
    checkPair('campusRoad49', 'campusRoad50');
    checkPair('campusRoad30', 'campusRoad49');
    checkPair('campusRoad38', 'campusRoad50');

    expect(getNavigationHotspots(getScene('campusRoad28')).map((item) => item.target))
      .not.toContain('multipurposeGym');
    expect(getNavigationHotspots(getScene('campusRoad46'))).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'campusRoad45', yaw: 0, pitch: -3 }),
      expect.objectContaining({ target: 'campusRoad51', yaw: 150, pitch: -3 })
    ]));
    expect(getNavigationHotspots(getScene('campusRoad45'))).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'campusRoad44', yaw: -90, pitch: -3 }),
      expect.objectContaining({ target: 'campusRoad47', yaw: 0, pitch: -3 }),
      expect.objectContaining({ target: 'campusRoad46', yaw: 180, pitch: -3 })
    ]));

    expect(getInfoHotspots(getScene('multipurposeGym'))).toEqual([
      expect.objectContaining({ id: 'multipurpose-gym-info', yaw: 0, pitch: 12 }),
      expect.objectContaining({ id: 'outdoor-football-field-info', yaw: 145, pitch: 0 })
    ]);

    for (const file of files) {
      expect(readJpegDimensions(resolve(process.cwd(), 'public/mainimages', file)), file)
        .toEqual({ width: 7680, height: 3840 });
    }
  });

  it('adds the reciprocal dormitory loop, Red Dome connection and three landmarks', () => {
    const dormitoryIds = [
      'campusRoad51',
      'campusRoad52',
      'campusRoad53',
      'campusRoad54',
      'campusRoad55',
      'campusRoad56',
      'campusRoad57',
      'campusRoad58',
      'maleDormitory',
      'dormitoryJunction',
      'femaleDormitory1',
      'femaleDormitoryMinimart',
      'dormitoryRoad',
      'femaleDormitory2'
    ] as const;
    const files = [
      'temp9-3-2.jpg',
      ...Array.from({ length: 13 }, (_, index) => `temp8-${index + 1}.jpg`)
    ];

    expect(dormitoryIds.map((id) => new URL(getScene(id).panorama, 'https://tour.local').pathname))
      .toEqual(files.map((file) => `/mainimages/${file}`));

    const pairs = [
      ['campusRoad12', 'campusRoad52'],
      ['campusRoad52', 'campusRoad53'],
      ['campusRoad53', 'campusRoad54'],
      ['campusRoad54', 'campusRoad55'],
      ['campusRoad55', 'campusRoad56'],
      ['campusRoad56', 'campusRoad57'],
      ['campusRoad57', 'campusRoad58'],
      ['campusRoad58', 'maleDormitory'],
      ['maleDormitory', 'dormitoryJunction'],
      ['maleDormitory', 'dormitoryRoad'],
      ['dormitoryJunction', 'femaleDormitory1'],
      ['femaleDormitory1', 'femaleDormitoryMinimart'],
      ['femaleDormitoryMinimart', 'dormitoryRoad'],
      ['dormitoryRoad', 'femaleDormitory2'],
      ['campusRoad46', 'campusRoad51'],
      ['campusRoad51', 'dormitoryJunction']
    ] as const;
    for (const [from, to] of pairs) {
      expect(getNavigationHotspots(getScene(from)).map((item) => item.target)).toContain(to);
      expect(getNavigationHotspots(getScene(to)).map((item) => item.target)).toContain(from);
    }

    expect(getNavigationHotspots(getScene('femaleDormitory2')).map((item) => item.target))
      .toEqual(['dormitoryRoad']);
    expect(getMapLandmarkScenes().map((scene) => scene.id)).toEqual(expect.arrayContaining([
      'maleDormitory',
      'femaleDormitory1',
      'femaleDormitory2'
    ]));

    for (const file of files) {
      expect(readJpegDimensions(resolve(process.cwd(), 'public/mainimages', file)), file)
        .toEqual({ width: 7680, height: 3840 });
    }
  });

  it('adds the complete reciprocal FITM indoor graph at the faculty map position', () => {
    const fitmIds = Array.from(
      { length: 17 },
      (_, index) => `fitmInterior${index + 1}` as Parameters<typeof getScene>[0]
    );
    const roomIds = ['puangKhramRoom1', 'puangKhrangRoom2'] as const;
    const files = [
      ...Array.from({ length: 17 }, (_, index) => `temp-faculty-${index + 1}.jpg`),
      'temp-puang-khram1.jpg',
      'temp-puang-khram2.jpg'
    ];

    expect([...fitmIds, ...roomIds].map((id) => new URL(getScene(id).panorama, 'https://tour.local').pathname))
      .toEqual(files.map((file) => `/mainimages/${file}`));
    expect([...fitmIds, ...roomIds].every((id) => (
      getScene(id).mapPosition.x === 311 && getScene(id).mapPosition.y === 358
    ))).toBe(true);

    const pairs = [
      ['campusRoad34', 'fitmInterior1'],
      ['fitmInterior1', 'fitmInterior2'],
      ['fitmInterior2', 'fitmInterior3'],
      ['fitmInterior2', 'puangKhrangRoom2'],
      ['fitmInterior3', 'fitmInterior4'],
      ['fitmInterior4', 'puangKhramRoom1'],
      ['fitmInterior4', 'fitmInterior5'],
      ['fitmInterior5', 'campusRoad25'],
      ['fitmInterior4', 'fitmInterior6'],
      ['fitmInterior6', 'fitmInterior7'],
      ['fitmInterior7', 'fitmInterior12'],
      ['fitmInterior12', 'fitmInterior11'],
      ['fitmInterior11', 'fitmInterior13'],
      ['fitmInterior13', 'fitmInterior14'],
      ['fitmInterior14', 'fitmInterior15'],
      ['fitmInterior15', 'fitmInterior16'],
      ['fitmInterior16', 'fitmInterior17'],
      ['fitmInterior7', 'fitmInterior8'],
      ['fitmInterior8', 'fitmInterior9'],
      ['fitmInterior9', 'fitmInterior10'],
      ['fitmInterior10', 'campusRoad36'],
      ['fitmInterior10', 'universityCafeteria']
    ] as const;
    for (const [from, to] of pairs) {
      expect(getNavigationHotspots(getScene(from)).map((item) => item.target)).toContain(to);
      expect(getNavigationHotspots(getScene(to)).map((item) => item.target)).toContain(from);
    }
    expect(getNavigationHotspots(getScene('campusRoad36')).map((item) => item.target))
      .not.toContain('universityCafeteria');

    const newInfoIds = new Set([
      'male-dormitory-info',
      'male-dormitory-motorcycle-parking-info',
      'female-dormitory-1-info',
      'female-dormitory-1-mixed-parking-info',
      'female-dormitory-minimart-info',
      'female-dormitory-minimart-motorcycle-parking-info',
      'female-dormitory-2-info',
      'female-dormitory-2-mixed-parking-info',
      'fitm-copy-room-info',
      'fitm-student-club-info',
      'fitm-coworking-space-info',
      'fitm-nurse-room-info',
      'fitm-stairs-1-to-second-floor-info',
      'fitm-stairs-2-to-second-floor-info'
    ]);
    const infoIds = tourScenes.flatMap((scene) => getInfoHotspots(scene).map((info) => info.id));
    expect(infoIds.filter((id) => newInfoIds.has(id))).toHaveLength(14);
    expect(infoIds).not.toContain('orange-blossom-room-info');

    for (const file of files) {
      expect(readJpegDimensions(resolve(process.cwd(), 'public/mainimages', file)), file)
        .toEqual({ width: 7680, height: 3840 });
    }
  });

  it('uses all four full-resolution temp5 panoramas with their map positions and information points', () => {
    const ids = ['campusRoad23', 'campusRoad24', 'campusRoad25', 'campusRoad26'] as const;
    const expectedFiles = ['temp5-1.jpg', 'temp5-2.jpg', 'temp5-3.jpg', 'temp5-4.jpg'];
    const expectedPositions = [
      { x: 390, y: 342 },
      { x: 374, y: 360 },
      { x: 359, y: 379 },
      { x: 343, y: 398 }
    ];
    const expectedInfo = [
      { id: 'luang-pho-sing-shrine-info', yaw: 98, pitch: 4 },
      { id: 'faculty-technology-car-parking-info', yaw: 108, pitch: 2 },
      { id: 'faculty-technology-motorcycle-parking-1-info', yaw: 30, pitch: 1 },
      { id: 'faculty-technology-motorcycle-parking-2-info', yaw: 0, pitch: 2 }
    ];

    const scenes = ids.map((sceneId) => getScene(sceneId));
    expect(scenes.map((scene) => new URL(scene.panorama, 'https://tour.local').pathname))
      .toEqual(expectedFiles.map((file) => `/mainimages/${file}`));
    expect(scenes.map((scene) => scene.mapPosition)).toEqual(expectedPositions);

    scenes.forEach((scene, index) => {
      const info = getInfoHotspots(scene);
      expect(info).toHaveLength(1);
      expect({
        id: info[0]!.id,
        yaw: info[0]!.yaw,
        pitch: info[0]!.pitch
      }).toEqual(expectedInfo[index]);
    });

    for (const file of expectedFiles) {
      expect(readJpegDimensions(resolve(process.cwd(), 'public/mainimages', file)), file)
        .toEqual({ width: 7680, height: 3840 });
    }
  });

  it('keeps every Info definition geometry-only while preserving valid legacy bootstrap content', () => {
    const infoHotspots = tourScenes.flatMap((scene) => getInfoHotspots(scene));
    expect(infoHotspots).toHaveLength(38);
    expect(new Set(infoHotspots.map((hotspot) => hotspot.id)).size).toBe(38);

    for (const hotspot of infoHotspots) {
      expect(Object.keys(hotspot).sort()).toEqual(['id', 'pitch', 'type', 'yaw']);
    }

    const infoIds = new Set(infoHotspots.map((hotspot) => hotspot.id));
    expect(placeContentBootstrap).not.toHaveProperty('multipurpose-gym-info');
    expect(placeContentBootstrap).not.toHaveProperty('outdoor-football-field-info');
    for (const [id, bootstrap] of Object.entries(placeContentBootstrap)) {
      expect(infoIds.has(id), `${id} is no longer linked to an Info hotspot`).toBe(true);
      const parsed = hotspotDataSchema.parse(bootstrap);
      expect(parsed.images.length, `${id} needs a bootstrap image`).toBeGreaterThanOrEqual(1);
      for (const image of parsed.images) {
        expect(image.src).toMatch(/^(?:\/mainimages\/|https:\/\/)/);
        expect(image.src).not.toMatch(/^\/tour\/(?:pano|thumbs)\//);
        if (image.src.startsWith('/mainimages/')) {
          expect(existsSync(publicAssetPath(image.src)), `${image.src} is missing`).toBe(true);
        }
      }
      for (const locale of locales) {
        expect(parsed.title[locale].trim()).not.toBe('');
        expect(parsed.description[locale].trim()).not.toBe('');
        expect(parsed.reference.label[locale].trim()).not.toBe('');
      }
    }
  });

  it('returns only the 93 versioned source panoramas from the tour assets API', async () => {
    const response = await getTourAssets();
    const body = await response.json() as { assets: string[] };
    expect(body.assets).toEqual(tourScenes.map((scene) => scene.panorama));
    expect(new Set(body.assets).size).toBe(93);
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
