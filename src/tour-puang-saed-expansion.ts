import { isDeepStrictEqual } from 'node:util';
import { tourStructureDataSchema, type TourStructureData } from './tour-structure.ts';
import {
  extractNavigationSnapshot,
  findNewNavigationIssues,
  type NavigationSnapshot
} from './tour-navigation-sync.ts';

export const PUANG_SAED_SCENE_ID = 'puangSaedRoom';
export const PUANG_SAED_NAVIGATION_IDS = [
  'fitm-interior-1-to-puang-saed-room',
  'puang-saed-room-to-interior-1'
] as const;

/** Add only this room and its entrance; never replay older content/scene expansions. */
export function mergePuangSaedExpansion(current: TourStructureData, code: TourStructureData) {
  const data = tourStructureDataSchema.parse(current);
  const target = tourStructureDataSchema.parse(code);
  const desiredRoom = target.scenes.find((scene) => scene.id === PUANG_SAED_SCENE_ID);
  const entrance = data.scenes.find((scene) => scene.id === 'fitmInterior1');
  if (!desiredRoom || !entrance || entrance.archived) {
    throw new Error('Cannot add Phuang Saed Room: the room or active fitmInterior1 entrance is missing.');
  }
  let room = data.scenes.find((scene) => scene.id === PUANG_SAED_SCENE_ID);
  const addedSceneIds: string[] = [];
  const addedHotspotIds: string[] = [];
  if (room) {
    if (room.panorama !== desiredRoom.panorama || room.archived) {
      throw new Error(`Scene conflict: ${PUANG_SAED_SCENE_ID}. No existing room will be overwritten.`);
    }
  } else {
    if (data.scenes.some((scene) => scene.panorama.split('?')[0] === desiredRoom.panorama.split('?')[0])) {
      throw new Error('The Phuang Saed panorama is already assigned to another Scene ID.');
    }
    room = structuredClone(desiredRoom);
    room.hotspots = [];
    data.scenes.push(room);
    addedSceneIds.push(room.id);
  }
  for (const id of PUANG_SAED_NAVIGATION_IDS) {
    const desiredScene = target.scenes.find((scene) => scene.hotspots.some((hotspot) => hotspot.id === id));
    const desired = desiredScene?.hotspots.find((hotspot) => hotspot.id === id);
    if (!desiredScene || !desired || desired.type !== 'scene') throw new Error(`Missing code arrow: ${id}`);
    const destination = data.scenes.find((scene) => scene.id === desiredScene.id);
    if (!destination) throw new Error(`Missing source scene: ${desiredScene.id}`);
    const owner = data.scenes.find((scene) => scene.hotspots.some((hotspot) => hotspot.id === id));
    const existing = owner?.hotspots.find((hotspot) => hotspot.id === id);
    if (existing) {
      if (owner?.id !== desiredScene.id || !isDeepStrictEqual(existing, desired)) {
        throw new Error(`Hotspot conflict: ${id}. Keep Admin values and resolve the conflict first.`);
      }
    } else {
      if (destination.hotspots.some((hotspot) => hotspot.type === 'scene' && hotspot.target === desired.target)) {
        throw new Error(`An arrow to ${desired.target} already exists in ${destination.id} with a different ID.`);
      }
      destination.hotspots.push(structuredClone(desired));
      addedHotspotIds.push(id);
    }
  }
  tourStructureDataSchema.parse(data);
  const issues = findNewNavigationIssues(current, data);
  if (issues.length) throw new Error(`Invalid room route: ${issues.join('; ')}`);
  return { data, addedSceneIds, addedHotspotIds, changed: addedSceneIds.length + addedHotspotIds.length > 0 };
}

/** Advance only the two approved arrows, leaving unrelated VS Code/Admin baselines untouched. */
export function mergePuangSaedBaseline(baseline: NavigationSnapshot, code: TourStructureData): NavigationSnapshot {
  const approvedIds = new Set<string>(PUANG_SAED_NAVIGATION_IDS);
  const approved = extractNavigationSnapshot(code).filter((entry) => approvedIds.has(entry.id));
  if (approved.length !== approvedIds.size) throw new Error('Both Phuang Saed navigation arrows are required.');
  for (const entry of approved) {
    const previous = baseline.find((item) => item.id === entry.id);
    if (previous && !isDeepStrictEqual(previous, entry)) throw new Error(`Baseline conflict: ${entry.id}`);
  }
  return [...baseline.filter((entry) => !approvedIds.has(entry.id)), ...approved].sort((a, b) => a.id.localeCompare(b.id));
}
