import {
  tourStructureDataSchema,
  type TourStructureData,
  type TourStructureScene
} from './tour-structure.ts';

export const NEW_TOUR_SCENE_IDS = [
  'fitmFloor2Point1',
  'fitmFloor2Point2',
  'fitmFloor2Point3',
  'fitmFloor2Point4',
  'fitmFloor2Point5',
  'fitmFloor2Point6',
  'fitmFloor3Point1',
  'fitmFloor3Point2',
  'fitmFloor3Point3',
  'fitmFloor3Point4',
  'fitmFloor3Point5',
  'fitmFloor4Point1',
  'fitmFloor4Point2',
  'fitmFloor4Point3',
  'fitmFloor4Point4',
  'fitmFloor4Point5',
  'fitmFloor4Point6',
  'sirindhornLibraryFloor1Point1',
  'sirindhornLibraryFloor1Point2',
  'sirindhornLibraryFloor1Point3',
  'sirindhornLibraryFloor2Point1',
  'sirindhornLibraryFloor2Point2',
  'sirindhornLibraryFloor2Point3',
  'sirindhornLibraryFloor3Point1',
  'sirindhornLibraryFloor3Point2',
  'sirindhornLibraryFloor3Point3',
  'sirindhornLibraryFloor4Point1',
  'sirindhornLibraryFloor4Point2',
  'sirindhornLibraryFloor4Point3',
  'sirindhornLibraryFloor4Point4'
] as const;

export const RETIRED_TOUR_INFO_IDS = [
  'Sirindhorn Building-info',
  'fitm-stairs-1-to-second-floor-info',
  'fitm-stairs-2-to-second-floor-info'
] as const;

type TourHotspot = TourStructureScene['hotspots'][number];

interface HotspotReplacement {
  readonly sceneId: string;
  readonly retired: TourHotspot;
  readonly replacementId: string;
}

const hotspotReplacements: readonly HotspotReplacement[] = [
  {
    sceneId: 'campusRoad22',
    retired: { id: 'Sirindhorn Building-info', type: 'info', yaw: 0, pitch: 5 },
    replacementId: 'campus-road-22-to-sirindhorn-library-floor-1-point-1'
  },
  {
    sceneId: 'fitmInterior8',
    retired: { id: 'fitm-stairs-1-to-second-floor-info', type: 'info', yaw: -95, pitch: 8 },
    replacementId: 'fitm-interior-8-to-floor-2-point-1'
  },
  {
    sceneId: 'fitmInterior13',
    retired: { id: 'fitm-stairs-2-to-second-floor-info', type: 'info', yaw: -95, pitch: 8 },
    replacementId: 'fitm-interior-13-to-floor-2-point-4'
  }
];

function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class TourExpansionCollisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TourExpansionCollisionError';
  }
}

/**
 * Adds only the approved scenes and replaces only the three retired Info geometry points.
 * All unrelated Admin edits remain untouched. A conflicting new scene or edited retired
 * hotspot stops the sync instead of overwriting it.
 */
export function mergeTourExpansion(
  currentInput: TourStructureData,
  targetInput: TourStructureData
): { readonly data: TourStructureData; readonly changed: boolean } {
  const current = tourStructureDataSchema.parse(currentInput);
  const target = tourStructureDataSchema.parse(targetInput);
  const result = clone(current);
  const resultScenes = new Map(result.scenes.map((scene) => [scene.id, scene]));
  const targetScenes = new Map(target.scenes.map((scene) => [scene.id, scene]));

  for (const sceneId of NEW_TOUR_SCENE_IDS) {
    const targetScene = targetScenes.get(sceneId);
    if (!targetScene) {
      throw new TourExpansionCollisionError(`ไม่พบฉากใหม่ ${sceneId} ในโครงสร้างจากโค้ด`);
    }
    const existingScene = resultScenes.get(sceneId);
    if (existingScene) {
      if (!equalJson(existingScene, targetScene)) {
        throw new TourExpansionCollisionError(
          `ฉาก ${sceneId} มีอยู่แล้วแต่ข้อมูลไม่ตรงกับโค้ด จึงหยุดเพื่อไม่เขียนทับข้อมูล Admin`
        );
      }
      continue;
    }
    const appended = clone(targetScene);
    result.scenes.push(appended);
    resultScenes.set(sceneId, appended);
  }

  for (const replacement of hotspotReplacements) {
    const scene = resultScenes.get(replacement.sceneId);
    const targetScene = targetScenes.get(replacement.sceneId);
    if (!scene || !targetScene) {
      throw new TourExpansionCollisionError(`ไม่พบฉากที่ต้องแก้ ${replacement.sceneId}`);
    }
    const desired = targetScene.hotspots.find((hotspot) => hotspot.id === replacement.replacementId);
    if (!desired) {
      throw new TourExpansionCollisionError(`ไม่พบลูกศรใหม่ ${replacement.replacementId} ในโครงสร้างจากโค้ด`);
    }
    const existingDesired = scene.hotspots.find((hotspot) => hotspot.id === replacement.replacementId);
    if (existingDesired) {
      if (!equalJson(existingDesired, desired)) {
        throw new TourExpansionCollisionError(
          `ลูกศร ${replacement.replacementId} มีข้อมูลไม่ตรงกับโค้ด จึงหยุดเพื่อไม่เขียนทับข้อมูล Admin`
        );
      }
      continue;
    }
    const retiredIndex = scene.hotspots.findIndex((hotspot) => hotspot.id === replacement.retired.id);
    if (retiredIndex < 0) {
      throw new TourExpansionCollisionError(
        `ไม่พบ ${replacement.retired.id} และยังไม่มี ${replacement.replacementId} ในฉาก ${replacement.sceneId}`
      );
    }
    if (!equalJson(scene.hotspots[retiredIndex], replacement.retired)) {
      throw new TourExpansionCollisionError(
        `Hotspot ${replacement.retired.id} ถูกแก้ใน Admin แล้ว จึงหยุดเพื่อไม่เขียนทับข้อมูล`
      );
    }
    scene.hotspots.splice(retiredIndex, 1, clone(desired));
  }

  const parsed = tourStructureDataSchema.parse(result);
  return { data: parsed, changed: !equalJson(current, parsed) };
}
