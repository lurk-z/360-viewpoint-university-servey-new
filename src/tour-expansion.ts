import {
  tourStructureDataSchema,
  type TourStructureData,
  type TourStructureScene
} from './tour-structure.ts';

/** Scenes added by the FITM upper-floor and Sirindhorn expansion. */
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

/** Scenes added by the connector, electrical lab and mechanical lab expansion. */
export const LAB_AND_CONNECTOR_SCENE_IDS = [
  'fitmFloor2Point2A',
  'itiElectricalLab1',
  'itiElectricalLab2',
  'itiElectricalLab3',
  'mechanicalLab1',
  'mechanicalLab2',
  'mechanicalLab3'
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

interface NavigationPatch {
  readonly sceneId: string;
  readonly desiredId: string;
  readonly retired?: TourHotspot;
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

const navigationPatches: readonly NavigationPatch[] = [
  {
    sceneId: 'fitmFloor2Point2',
    desiredId: 'fitm-floor-2-point-2-to-point-2a',
    retired: { id: 'fitm-floor-2-point-2-to-point-3', type: 'scene', target: 'fitmFloor2Point3', yaw: 0, pitch: -3 }
  },
  {
    sceneId: 'fitmFloor2Point3',
    desiredId: 'fitm-floor-2-point-3-to-point-2a',
    retired: { id: 'fitm-floor-2-point-3-to-point-2', type: 'scene', target: 'fitmFloor2Point2', yaw: 180, pitch: -3 }
  },
  { sceneId: 'fitmFloor3Point4', desiredId: 'fitm-floor-3-point-4-to-floor-2-point-2a' },
  { sceneId: 'fitmInterior15', desiredId: 'fitm-interior-15-to-iti-electrical-lab-1' },
  { sceneId: 'fitmInterior17', desiredId: 'fitm-interior-17-to-mechanical-lab-1' }
];

/**
 * Navigation entries owned by this expansion. The sync command uses this list
 * to advance only the affected portion of an existing three-way baseline,
 * leaving unrelated Admin/code differences untouched.
 */
export function getTourExpansionNavigationIds(targetInput: TourStructureData): readonly string[] {
  const target = tourStructureDataSchema.parse(targetInput);
  const expansionSceneIds = new Set<string>(LAB_AND_CONNECTOR_SCENE_IDS);
  return [...new Set([
    ...target.scenes.flatMap((scene) => expansionSceneIds.has(scene.id)
      ? scene.hotspots.filter((hotspot) => hotspot.type === 'scene').map((hotspot) => hotspot.id)
      : []),
    ...navigationPatches.flatMap((patch) => [
      patch.desiredId,
      ...(patch.retired ? [patch.retired.id] : [])
    ])
  ])].sort();
}

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

function insertSceneInTargetOrder(
  scenes: TourStructureScene[],
  scene: TourStructureScene,
  targetScenes: readonly TourStructureScene[]
): TourStructureScene {
  const targetIndex = targetScenes.findIndex((item) => item.id === scene.id);
  const nextExisting = targetScenes.slice(targetIndex + 1)
    .map((item) => item.id)
    .find((sceneId) => scenes.some((item) => item.id === sceneId));
  const insertionIndex = nextExisting
    ? scenes.findIndex((item) => item.id === nextExisting)
    : scenes.length;
  const inserted = clone(scene);
  scenes.splice(insertionIndex, 0, inserted);
  return inserted;
}

function navigationOnly(scene: TourStructureScene): readonly TourHotspot[] {
  return scene.hotspots.filter((hotspot) => hotspot.type === 'scene');
}

function applyReplacement(
  resultScenes: Map<string, TourStructureScene>,
  targetScenes: Map<string, TourStructureScene>,
  replacement: HotspotReplacement
): void {
  const scene = resultScenes.get(replacement.sceneId);
  const targetScene = targetScenes.get(replacement.sceneId);
  if (!scene || !targetScene) {
    throw new TourExpansionCollisionError(`Missing scene required by expansion: ${replacement.sceneId}`);
  }
  const desired = targetScene.hotspots.find((hotspot) => hotspot.id === replacement.replacementId);
  if (!desired) {
    throw new TourExpansionCollisionError(`Missing hotspot in code: ${replacement.replacementId}`);
  }
  const existingDesired = scene.hotspots.find((hotspot) => hotspot.id === replacement.replacementId);
  if (existingDesired) {
    if (!equalJson(existingDesired, desired)) {
      throw new TourExpansionCollisionError(`Hotspot ${replacement.replacementId} conflicts with the code version.`);
    }
    return;
  }
  const retiredIndex = scene.hotspots.findIndex((hotspot) => hotspot.id === replacement.retired.id);
  if (retiredIndex < 0 || !equalJson(scene.hotspots[retiredIndex], replacement.retired)) {
    throw new TourExpansionCollisionError(
      `Hotspot ${replacement.retired.id} was changed or removed. No Admin data was overwritten.`
    );
  }
  scene.hotspots.splice(retiredIndex, 1, clone(desired));
}

function applyNavigationPatch(
  resultScenes: Map<string, TourStructureScene>,
  targetScenes: Map<string, TourStructureScene>,
  patch: NavigationPatch
): void {
  const scene = resultScenes.get(patch.sceneId);
  const targetScene = targetScenes.get(patch.sceneId);
  if (!scene || !targetScene) {
    throw new TourExpansionCollisionError(`Missing scene required by navigation expansion: ${patch.sceneId}`);
  }
  const desired = targetScene.hotspots.find((hotspot) => hotspot.id === patch.desiredId);
  if (!desired || desired.type !== 'scene') {
    throw new TourExpansionCollisionError(`Missing navigation hotspot in code: ${patch.desiredId}`);
  }
  const existingDesired = scene.hotspots.find((hotspot) => hotspot.id === patch.desiredId);
  if (existingDesired) {
    if (!equalJson(existingDesired, desired)) {
      throw new TourExpansionCollisionError(`Navigation hotspot ${patch.desiredId} conflicts with the code version.`);
    }
    return;
  }
  const duplicateTarget = scene.hotspots.find((hotspot) => (
    hotspot.type === 'scene' && hotspot.target === desired.target
  ));
  if (duplicateTarget && duplicateTarget.id !== patch.retired?.id) {
    throw new TourExpansionCollisionError(
      `Scene ${patch.sceneId} already has navigation to ${desired.target} using hotspot ${duplicateTarget.id}.`
    );
  }
  if (patch.retired) {
    const retiredIndex = scene.hotspots.findIndex((hotspot) => hotspot.id === patch.retired!.id);
    if (retiredIndex < 0 || !equalJson(scene.hotspots[retiredIndex], patch.retired)) {
      throw new TourExpansionCollisionError(
        `Navigation hotspot ${patch.retired.id} was changed or removed. No Admin data was overwritten.`
      );
    }
    scene.hotspots.splice(retiredIndex, 1, clone(desired));
    return;
  }
  scene.hotspots.push(clone(desired));
}

/**
 * Adds the approved scenes and applies only the explicitly listed hotspot changes.
 * Scene copy edited in Admin is preserved; a panorama or navigation collision stops
 * the sync before any database update is performed.
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

  for (const sceneId of [...NEW_TOUR_SCENE_IDS, ...LAB_AND_CONNECTOR_SCENE_IDS]) {
    const targetScene = targetScenes.get(sceneId);
    if (!targetScene) {
      throw new TourExpansionCollisionError(`Missing approved scene in code: ${sceneId}`);
    }
    const existingScene = resultScenes.get(sceneId);
    if (existingScene) {
      if (LAB_AND_CONNECTOR_SCENE_IDS.includes(sceneId as (typeof LAB_AND_CONNECTOR_SCENE_IDS)[number])
        && (existingScene.panorama !== targetScene.panorama
          || !equalJson(navigationOnly(existingScene), navigationOnly(targetScene)))) {
        throw new TourExpansionCollisionError(
          `Scene ${sceneId} already exists with a different panorama or navigation graph. No Admin data was overwritten.`
        );
      }
      continue;
    }
    const inserted = insertSceneInTargetOrder(result.scenes, targetScene, target.scenes);
    resultScenes.set(sceneId, inserted);
  }

  hotspotReplacements.forEach((replacement) => applyReplacement(resultScenes, targetScenes, replacement));
  navigationPatches.forEach((patch) => applyNavigationPatch(resultScenes, targetScenes, patch));

  const parsed = tourStructureDataSchema.parse(result);
  return { data: parsed, changed: !equalJson(current, parsed) };
}
