import { describe, expect, it } from 'vitest';
import { createBootstrapTourStructureData, tourStructureDataSchema } from './tour-structure';
import {
  LAB_AND_CONNECTOR_SCENE_IDS,
  NEW_TOUR_SCENE_IDS,
  TourExpansionCollisionError,
  mergeTourExpansion
} from './tour-expansion';

function createLegacyStructure() {
  const target = createBootstrapTourStructureData();
  const legacy = structuredClone(target);
  const expansionSceneIds = new Set<string>([
    ...NEW_TOUR_SCENE_IDS,
    ...LAB_AND_CONNECTOR_SCENE_IDS
  ]);
  legacy.scenes = legacy.scenes.filter((scene) => !expansionSceneIds.has(scene.id));
  for (const [sceneId, hotspotId] of [
    ['fitmInterior15', 'fitm-interior-15-to-iti-electrical-lab-1'],
    ['fitmInterior17', 'fitm-interior-17-to-mechanical-lab-1']
  ] as const) {
    const scene = legacy.scenes.find((item) => item.id === sceneId)!;
    scene.hotspots = scene.hotspots.filter((hotspot) => hotspot.id !== hotspotId);
  }
  const replacements = [
    {
      sceneId: 'campusRoad22',
      replacementId: 'campus-road-22-to-sirindhorn-library-floor-1-point-1',
      retired: { id: 'Sirindhorn Building-info', type: 'info' as const, yaw: 0, pitch: 5 }
    },
    {
      sceneId: 'fitmInterior8',
      replacementId: 'fitm-interior-8-to-floor-2-point-1',
      retired: { id: 'fitm-stairs-1-to-second-floor-info', type: 'info' as const, yaw: -95, pitch: 8 }
    },
    {
      sceneId: 'fitmInterior13',
      replacementId: 'fitm-interior-13-to-floor-2-point-4',
      retired: { id: 'fitm-stairs-2-to-second-floor-info', type: 'info' as const, yaw: -95, pitch: 8 }
    }
  ];
  for (const replacement of replacements) {
    const scene = legacy.scenes.find((item) => item.id === replacement.sceneId)!;
    const index = scene.hotspots.findIndex((hotspot) => hotspot.id === replacement.replacementId);
    scene.hotspots.splice(index, 1, replacement.retired);
  }
  return tourStructureDataSchema.parse(legacy);
}

function createStructureBeforeLabExpansion() {
  const target = createBootstrapTourStructureData();
  const current = structuredClone(target);
  const latestSceneIds = new Set<string>(LAB_AND_CONNECTOR_SCENE_IDS);
  current.scenes = current.scenes.filter((scene) => !latestSceneIds.has(scene.id));

  const point2 = current.scenes.find((scene) => scene.id === 'fitmFloor2Point2')!;
  point2.hotspots.splice(
    point2.hotspots.findIndex((hotspot) => hotspot.id === 'fitm-floor-2-point-2-to-point-2a'),
    1,
    { id: 'fitm-floor-2-point-2-to-point-3', type: 'scene', target: 'fitmFloor2Point3', yaw: 0, pitch: -3 }
  );
  const point3 = current.scenes.find((scene) => scene.id === 'fitmFloor2Point3')!;
  point3.hotspots.splice(
    point3.hotspots.findIndex((hotspot) => hotspot.id === 'fitm-floor-2-point-3-to-point-2a'),
    1,
    { id: 'fitm-floor-2-point-3-to-point-2', type: 'scene', target: 'fitmFloor2Point2', yaw: 180, pitch: -3 }
  );
  for (const [sceneId, hotspotId] of [
    ['fitmFloor3Point4', 'fitm-floor-3-point-4-to-floor-2-point-2a'],
    ['fitmInterior15', 'fitm-interior-15-to-iti-electrical-lab-1'],
    ['fitmInterior17', 'fitm-interior-17-to-mechanical-lab-1']
  ] as const) {
    const scene = current.scenes.find((item) => item.id === sceneId)!;
    scene.hotspots = scene.hotspots.filter((hotspot) => hotspot.id !== hotspotId);
  }

  return tourStructureDataSchema.parse(current);
}

describe('tour expansion sync merge', () => {
  it('adds all approved scenes and hotspot replacements to the original structure idempotently', () => {
    const target = createBootstrapTourStructureData();
    const legacy = createLegacyStructure();
    legacy.scenes[0]!.description.th = 'ข้อความที่ผู้ดูแลแก้ไว้';

    const first = mergeTourExpansion(legacy, target);
    expect(first.changed).toBe(true);
    expect(first.data.scenes).toHaveLength(130);
    expect(first.data.scenes[0]!.description.th).toBe('ข้อความที่ผู้ดูแลแก้ไว้');

    const second = mergeTourExpansion(first.data, target);
    expect(second.changed).toBe(false);
    expect(second.data).toEqual(first.data);
  });

  it('adds the connector and lab scenes to the existing 123-scene structure without overwriting copy', () => {
    const target = createBootstrapTourStructureData();
    const current = createStructureBeforeLabExpansion();
    current.scenes.find((scene) => scene.id === 'fitmInterior15')!.description.en = 'Admin-edited description';

    const first = mergeTourExpansion(current, target);
    expect(first.changed).toBe(true);
    expect(first.data.scenes).toHaveLength(130);
    expect(first.data.scenes.find((scene) => scene.id === 'fitmInterior15')!.description.en)
      .toBe('Admin-edited description');
    expect(first.data.scenes.find((scene) => scene.id === 'fitmFloor2Point2')!.hotspots)
      .toContainEqual(expect.objectContaining({ target: 'fitmFloor2Point2A' }));

    const second = mergeTourExpansion(first.data, target);
    expect(second.changed).toBe(false);
    expect(second.data).toEqual(first.data);
  });

  it('stops when a new scene already exists with conflicting Admin data', () => {
    const target = createBootstrapTourStructureData();
    const current = structuredClone(target);
    current.scenes.find((scene) => scene.id === 'fitmFloor2Point2A')!.panorama = '/mainimages/conflict.jpg';

    expect(() => mergeTourExpansion(current, target)).toThrow(TourExpansionCollisionError);
  });

  it('stops when a retired Info geometry was edited in Admin', () => {
    const target = createBootstrapTourStructureData();
    const current = createLegacyStructure();
    const scene = current.scenes.find((item) => item.id === 'fitmInterior8')!;
    const hotspot = scene.hotspots.find((item) => item.id === 'fitm-stairs-1-to-second-floor-info')!;
    hotspot.yaw = -80;

    expect(() => mergeTourExpansion(current, target)).toThrow(TourExpansionCollisionError);
  });
});
