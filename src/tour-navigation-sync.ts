import { z } from 'zod';
import {
  analyzeTourStructure,
  tourStructureDataSchema,
  type TourStructureData
} from './tour-structure.ts';

const navigationEntrySchema = z.object({
  id: z.string().min(1),
  sceneId: z.string().min(1),
  target: z.string().min(1),
  yaw: z.number().finite(),
  pitch: z.number().finite(),
  direction: z.enum(['standard', 'up', 'down']).optional()
});

export const navigationSnapshotSchema = z.array(navigationEntrySchema).max(80_000);

export type NavigationEntry = z.infer<typeof navigationEntrySchema>;
export type NavigationSnapshot = readonly NavigationEntry[];

export interface NavigationConflict {
  readonly id: string;
  readonly baseline: NavigationEntry | null;
  readonly code: NavigationEntry | null;
  readonly current: NavigationEntry | null;
}

export interface NavigationChangeSummary {
  readonly added: readonly string[];
  readonly updated: readonly string[];
  readonly moved: readonly string[];
  readonly deleted: readonly string[];
}

export interface NavigationMergeResult {
  readonly data: TourStructureData;
  readonly conflicts: readonly NavigationConflict[];
  readonly changes: NavigationChangeSummary;
  readonly codeChangedIds: readonly string[];
  readonly changed: boolean;
}

export class NavigationPreservationError extends Error {
  readonly missingSceneIds: readonly string[];

  constructor(missingSceneIds: readonly string[]) {
    super(`Navigation refers to scenes missing from the submitted structure: ${missingSceneIds.join(', ')}`);
    this.name = 'NavigationPreservationError';
    this.missingSceneIds = missingSceneIds;
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function equalEntry(left: NavigationEntry | undefined, right: NavigationEntry | undefined): boolean {
  return left?.id === right?.id
    && left?.sceneId === right?.sceneId
    && left?.target === right?.target
    && left?.yaw === right?.yaw
    && left?.pitch === right?.pitch
    && left?.direction === right?.direction;
}

function entryMap(snapshot: NavigationSnapshot): Map<string, NavigationEntry> {
  return new Map(snapshot.map((entry) => [entry.id, entry]));
}

function sortEntries(entries: readonly NavigationEntry[]): NavigationEntry[] {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id));
}

export function extractNavigationSnapshot(input: TourStructureData): NavigationSnapshot {
  const data = tourStructureDataSchema.parse(input);
  return sortEntries(data.scenes.flatMap((scene) => scene.hotspots.flatMap((hotspot) => (
    hotspot.type === 'scene'
      ? [{
        id: hotspot.id,
        sceneId: scene.id,
        target: hotspot.target,
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
        ...(hotspot.direction ? { direction: hotspot.direction } : {})
      }]
      : []
  ))));
}

export function navigationSnapshotsEqual(left: NavigationSnapshot, right: NavigationSnapshot): boolean {
  const normalizedLeft = navigationSnapshotSchema.parse(left);
  const normalizedRight = navigationSnapshotSchema.parse(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  const rightById = entryMap(normalizedRight);
  return normalizedLeft.every((entry) => equalEntry(entry, rightById.get(entry.id)));
}

export function getNavigationSnapshotSignature(snapshot: NavigationSnapshot): string {
  const normalized = sortEntries(navigationSnapshotSchema.parse(snapshot));
  let hash = 0x811c9dc5;
  const value = JSON.stringify(normalized);
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `navigation-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Development keeps all scene content from the database, while navigation for
 * code-owned scenes comes from tour-data.ts. Database-only scenes remain intact.
 */
export function overlayCodeNavigation(
  databaseInput: TourStructureData,
  codeInput: TourStructureData
): TourStructureData {
  const database = clone(tourStructureDataSchema.parse(databaseInput));
  const code = tourStructureDataSchema.parse(codeInput);
  const codeScenes = new Map(code.scenes.map((scene) => [scene.id, scene]));

  for (const scene of database.scenes) {
    const codeScene = codeScenes.get(scene.id);
    if (!codeScene) continue;
    const databaseInfo = scene.hotspots.filter((hotspot) => hotspot.type === 'info');
    const codeNavigation = codeScene.hotspots
      .filter((hotspot) => hotspot.type === 'scene')
      .map((hotspot) => clone(hotspot));
    scene.hotspots = [...codeNavigation, ...databaseInfo];
  }

  return tourStructureDataSchema.parse(database);
}

/**
 * Info geometry is Admin-owned whenever a database structure is available.
 * Report only code entries that are missing from Admin or differ there; extra
 * Admin entries are expected and must not be treated as conflicts.
 */
export function findCodeInfoGeometryDifferences(
  databaseInput: TourStructureData,
  codeInput: TourStructureData
): readonly string[] {
  const database = tourStructureDataSchema.parse(databaseInput);
  const code = tourStructureDataSchema.parse(codeInput);
  const databaseById = new Map(database.scenes.flatMap((scene) => scene.hotspots.flatMap((hotspot) => (
    hotspot.type === 'info'
      ? [[hotspot.id, { sceneId: scene.id, yaw: hotspot.yaw, pitch: hotspot.pitch }] as const]
      : []
  ))));
  return code.scenes.flatMap((scene) => scene.hotspots.flatMap((hotspot) => {
    if (hotspot.type !== 'info') return [];
    const current = databaseById.get(hotspot.id);
    return current
      && current.sceneId === scene.id
      && current.yaw === hotspot.yaw
      && current.pitch === hotspot.pitch
      ? []
      : [hotspot.id];
  })).sort();
}

/**
 * Admin may edit scene content and Info geometry, but navigation is owned by
 * tour-data.ts. This replaces every submitted scene hotspot with the navigation
 * from the latest database draft while preserving submitted Info hotspots.
 */
export function preserveCurrentNavigation(
  submittedInput: TourStructureData,
  currentInput: TourStructureData
): TourStructureData {
  const submitted = clone(tourStructureDataSchema.parse(submittedInput));
  const current = tourStructureDataSchema.parse(currentInput);
  const submittedScenes = new Map(submitted.scenes.map((scene) => [scene.id, scene]));
  const navigation = extractNavigationSnapshot(current);
  const missingSceneIds = [...new Set(navigation.flatMap((entry) => [
    ...(submittedScenes.has(entry.sceneId) ? [] : [entry.sceneId]),
    ...(submittedScenes.has(entry.target) ? [] : [entry.target])
  ]))].sort();
  if (missingSceneIds.length > 0) throw new NavigationPreservationError(missingSceneIds);

  for (const scene of submitted.scenes) {
    scene.hotspots = scene.hotspots.filter((hotspot) => hotspot.type === 'info');
  }
  for (const entry of navigation) {
    submittedScenes.get(entry.sceneId)!.hotspots.push({
      id: entry.id,
      type: 'scene',
      target: entry.target,
      yaw: entry.yaw,
      pitch: entry.pitch,
      ...(entry.direction ? { direction: entry.direction } : {})
    });
  }
  return tourStructureDataSchema.parse(submitted);
}

interface MutableNavigationChangeSummary {
  added: string[];
  updated: string[];
  moved: string[];
  deleted: string[];
}

function emptyChanges(): MutableNavigationChangeSummary {
  return { added: [], updated: [], moved: [], deleted: [] };
}

function describeChanges(
  current: NavigationSnapshot,
  result: NavigationSnapshot
): MutableNavigationChangeSummary {
  const changes = emptyChanges();
  const currentById = entryMap(current);
  const resultById = entryMap(result);
  const ids = [...new Set([...currentById.keys(), ...resultById.keys()])].sort();
  for (const id of ids) {
    const before = currentById.get(id);
    const after = resultById.get(id);
    if (!before && after) changes.added.push(id);
    else if (before && !after) changes.deleted.push(id);
    else if (before && after && before.sceneId !== after.sceneId) changes.moved.push(id);
    else if (before && after && !equalEntry(before, after)) changes.updated.push(id);
  }
  return changes;
}

export function mergeNavigationChanges(input: {
  readonly baseline: NavigationSnapshot;
  readonly code: NavigationSnapshot;
  readonly current: TourStructureData;
}): NavigationMergeResult {
  const baseline = navigationSnapshotSchema.parse(input.baseline);
  const code = navigationSnapshotSchema.parse(input.code);
  const currentData = tourStructureDataSchema.parse(input.current);
  const current = extractNavigationSnapshot(currentData);
  const baselineById = entryMap(baseline);
  const codeById = entryMap(code);
  const currentById = entryMap(current);
  const desiredById = new Map(currentById);
  const conflicts: NavigationConflict[] = [];
  const codeChangedIds: string[] = [];
  const ids = [...new Set([...baselineById.keys(), ...codeById.keys(), ...currentById.keys()])].sort();

  for (const id of ids) {
    const baseEntry = baselineById.get(id);
    const codeEntry = codeById.get(id);
    const currentEntry = currentById.get(id);
    const codeChanged = !equalEntry(baseEntry, codeEntry);
    if (!codeChanged) continue;
    codeChangedIds.push(id);
    const currentChanged = !equalEntry(baseEntry, currentEntry);
    if (currentChanged && !equalEntry(codeEntry, currentEntry)) {
      conflicts.push({
        id,
        baseline: baseEntry ?? null,
        code: codeEntry ?? null,
        current: currentEntry ?? null
      });
      continue;
    }
    if (codeEntry) desiredById.set(id, codeEntry);
    else desiredById.delete(id);
  }

  if (conflicts.length > 0) {
    return {
      data: currentData,
      conflicts,
      changes: emptyChanges(),
      codeChangedIds,
      changed: false
    };
  }

  const result = clone(currentData);
  const resultScenes = new Map(result.scenes.map((scene) => [scene.id, scene]));
  const currentIds = new Set(currentById.keys());
  const desiredIds = new Set(desiredById.keys());
  const affectedIds = new Set(codeChangedIds);

  for (const scene of result.scenes) {
    scene.hotspots = scene.hotspots.filter((hotspot) => (
      hotspot.type !== 'scene' || !affectedIds.has(hotspot.id)
    ));
  }

  for (const id of codeChangedIds) {
    const desired = desiredById.get(id);
    if (!desired) continue;
    const scene = resultScenes.get(desired.sceneId);
    if (!scene) {
      throw new Error(`Navigation hotspot ${id} refers to missing source scene ${desired.sceneId}`);
    }
    scene.hotspots.push({
      id: desired.id,
      type: 'scene',
      target: desired.target,
      yaw: desired.yaw,
      pitch: desired.pitch,
      ...(desired.direction ? { direction: desired.direction } : {})
    });
  }

  // Guard against accidental removal of Admin-only arrows while rebuilding.
  for (const id of currentIds) {
    if (!affectedIds.has(id) && !desiredIds.has(id)) {
      throw new Error(`Navigation hotspot ${id} was removed outside the code change set`);
    }
  }

  const parsed = tourStructureDataSchema.parse(result);
  const resultSnapshot = extractNavigationSnapshot(parsed);
  const changes = describeChanges(current, resultSnapshot);
  const changed = changes.added.length + changes.updated.length + changes.moved.length + changes.deleted.length > 0;
  return { data: parsed, conflicts, changes, codeChangedIds, changed };
}

function issueKey(issue: ReturnType<typeof analyzeTourStructure>[number]): string {
  return `${issue.code}:${issue.sceneId ?? ''}:${issue.hotspotId ?? ''}`;
}

/** Returns only graph problems introduced by this merge; existing warnings remain non-blocking. */
export function findNewNavigationIssues(
  before: TourStructureData,
  after: TourStructureData
): readonly string[] {
  const beforeKeys = new Set(analyzeTourStructure(before).map(issueKey));
  return analyzeTourStructure(after)
    .filter((issue) => !beforeKeys.has(issueKey(issue)))
    .map((issue) => issue.message);
}

export function formatNavigationEntry(entry: NavigationEntry | null): string {
  if (!entry) return '(deleted)';
  return `${entry.sceneId} -> ${entry.target} (yaw ${entry.yaw}, pitch ${entry.pitch}, direction ${entry.direction ?? 'standard'})`;
}
