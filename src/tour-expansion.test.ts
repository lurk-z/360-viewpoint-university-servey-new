import { describe, expect, it } from 'vitest';
import { createBootstrapTourStructureData, tourStructureDataSchema } from './tour-structure';
import {
  NEW_TOUR_SCENE_IDS,
  TourExpansionCollisionError,
  mergeTourExpansion
} from './tour-expansion';

function createLegacyStructure() {
  const target = createBootstrapTourStructureData();
  const legacy = structuredClone(target);
  legacy.scenes = legacy.scenes.filter((scene) => !NEW_TOUR_SCENE_IDS.includes(
    scene.id as (typeof NEW_TOUR_SCENE_IDS)[number]
  ));
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

describe('tour expansion sync merge', () => {
  it('adds the 30 scenes, applies only the three hotspot replacements and is idempotent', () => {
    const target = createBootstrapTourStructureData();
    const legacy = createLegacyStructure();
    legacy.scenes[0]!.description.th = 'ข้อความที่ผู้ดูแลแก้ไว้';

    const first = mergeTourExpansion(legacy, target);
    expect(first.changed).toBe(true);
    expect(first.data.scenes).toHaveLength(123);
    expect(first.data.scenes[0]!.description.th).toBe('ข้อความที่ผู้ดูแลแก้ไว้');

    const second = mergeTourExpansion(first.data, target);
    expect(second.changed).toBe(false);
    expect(second.data).toEqual(first.data);
  });

  it('stops when a new scene already exists with conflicting Admin data', () => {
    const target = createBootstrapTourStructureData();
    const current = structuredClone(target);
    current.scenes.find((scene) => scene.id === 'fitmFloor2Point1')!.title.th = 'ฉากที่ผู้ดูแลสร้างเอง';

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
