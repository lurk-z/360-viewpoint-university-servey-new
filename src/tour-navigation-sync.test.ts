import { describe, expect, it } from 'vitest';
import {
  NavigationPreservationError,
  extractNavigationSnapshot,
  findCodeInfoGeometryDifferences,
  findNewNavigationIssues,
  mergeNavigationChanges,
  navigationSnapshotsEqual,
  overlayCodeNavigation,
  preserveCurrentNavigation,
  type NavigationEntry
} from './tour-navigation-sync';
import {
  createBootstrapTourStructureData,
  getTourStructureDataSignature,
  tourStructureDataSchema,
  type TourStructureData
} from './tour-structure';

function cloneStructure(): TourStructureData {
  return structuredClone(createBootstrapTourStructureData());
}

function replaceNavigationEntry(data: TourStructureData, entry: NavigationEntry): void {
  for (const scene of data.scenes) {
    const index = scene.hotspots.findIndex((hotspot) => hotspot.type === 'scene' && hotspot.id === entry.id);
    if (index >= 0) scene.hotspots.splice(index, 1);
  }
  const source = data.scenes.find((scene) => scene.id === entry.sceneId);
  if (!source) throw new Error(`Missing test scene ${entry.sceneId}`);
  source.hotspots.push({
    id: entry.id,
    type: 'scene',
    target: entry.target,
    yaw: entry.yaw,
    pitch: entry.pitch,
    ...(entry.direction ? { direction: entry.direction } : {})
  });
}

function adjustedYaw(entry: NavigationEntry, amount = 1): number {
  return entry.yaw + amount <= 360 ? entry.yaw + amount : entry.yaw - amount;
}

describe('tour navigation development overlay', () => {
  it('uses code navigation while preserving database scene content and Info geometry', () => {
    const database = cloneStructure();
    const code = cloneStructure();
    const baseline = extractNavigationSnapshot(code);
    const entry = baseline[0]!;
    const changed = { ...entry, yaw: adjustedYaw(entry) };
    replaceNavigationEntry(code, changed);
    database.scenes[0]!.title.th = 'Admin scene title';
    const databaseInfo = database.scenes.flatMap((scene) => scene.hotspots.filter((hotspot) => hotspot.type === 'info'));

    const result = overlayCodeNavigation(database, code);

    expect(result.scenes[0]!.title.th).toBe('Admin scene title');
    expect(extractNavigationSnapshot(result)).toEqual(extractNavigationSnapshot(code));
    expect(result.scenes.flatMap((scene) => scene.hotspots.filter((hotspot) => hotspot.type === 'info')))
      .toEqual(databaseInfo);
  });

  it('keeps database-only scenes and their arrows intact', () => {
    const database = cloneStructure();
    const source = structuredClone(database.scenes[0]!);
    source.id = 'adminOnlyScene';
    source.panorama = '/admin-only.jpg';
    source.mapLandmark = false;
    source.hotspots = [{ id: 'admin-only-return', type: 'scene', target: database.startSceneId, yaw: 1, pitch: -3 }];
    database.scenes.push(source);
    database.scenes[0]!.hotspots.push({
      id: 'start-to-admin-only', type: 'scene', target: source.id, yaw: 2, pitch: -3
    });

    const result = overlayCodeNavigation(database, cloneStructure());
    expect(result.scenes.find((scene) => scene.id === source.id)?.hotspots).toEqual(source.hotspots);
  });

  it('warns when code Info differs but allows Admin-only Info', () => {
    const database = cloneStructure();
    const code = cloneStructure();
    const source = database.scenes[0]!;
    source.hotspots.push({ id: 'admin-only-info', type: 'info', yaw: 12, pitch: 3 });
    expect(findCodeInfoGeometryDifferences(database, code)).toEqual([]);

    const codeInfo = code.scenes.flatMap((scene) => scene.hotspots)
      .find((hotspot) => hotspot.type === 'info');
    expect(codeInfo).toBeDefined();
    if (!codeInfo || codeInfo.type !== 'info') return;
    codeInfo.yaw += 1;
    expect(findCodeInfoGeometryDifferences(database, code)).toEqual([codeInfo.id]);
  });
});

describe('Admin navigation protection', () => {
  it('restores current navigation while preserving submitted scene and Info edits', () => {
    const current = cloneStructure();
    const submitted = cloneStructure();
    const originalNavigation = extractNavigationSnapshot(current);
    const changedEntry = originalNavigation[0]!;
    replaceNavigationEntry(submitted, { ...changedEntry, yaw: adjustedYaw(changedEntry, 4) });
    const deletedEntry = originalNavigation[1]!;
    const deletedScene = submitted.scenes.find((scene) => scene.id === deletedEntry.sceneId)!;
    deletedScene.hotspots = deletedScene.hotspots.filter((hotspot) => hotspot.id !== deletedEntry.id);
    submitted.scenes[0]!.hotspots.push({
      id: 'forged-admin-arrow',
      type: 'scene',
      target: submitted.scenes[1]!.id,
      yaw: 55,
      pitch: -3
    });
    submitted.scenes[0]!.title.th = 'ชื่อฉากที่แก้จาก Admin';
    const info = submitted.scenes.flatMap((scene) => scene.hotspots.map((hotspot) => ({ scene, hotspot })))
      .find((item) => item.hotspot.type === 'info');
    expect(info).toBeDefined();
    if (!info || info.hotspot.type !== 'info') return;
    info.hotspot.yaw += 2;

    const result = preserveCurrentNavigation(submitted, current);

    expect(extractNavigationSnapshot(result)).toEqual(originalNavigation);
    expect(result.scenes[0]!.title.th).toBe('ชื่อฉากที่แก้จาก Admin');
    const preservedInfo = result.scenes.find((scene) => scene.id === info.scene.id)?.hotspots
      .find((hotspot) => hotspot.id === info.hotspot.id);
    expect(preservedInfo?.yaw).toBe(info.hotspot.yaw);
  });

  it('blocks restore or import data that omits a scene used by current navigation', () => {
    const current = cloneStructure();
    const missingScene = current.scenes.find((scene) => scene.id !== current.startSceneId)!;
    const submitted = cloneStructure();
    submitted.scenes = submitted.scenes
      .filter((scene) => scene.id !== missingScene.id)
      .map((scene) => ({
        ...scene,
        hotspots: scene.hotspots.filter((hotspot) => (
          hotspot.type !== 'scene' || hotspot.target !== missingScene.id
        ))
      }));

    expect(() => preserveCurrentNavigation(submitted, current)).toThrow(NavigationPreservationError);
    try {
      preserveCurrentNavigation(submitted, current);
    } catch (error) {
      expect(error).toBeInstanceOf(NavigationPreservationError);
      expect((error as NavigationPreservationError).missingSceneIds).toContain(missingScene.id);
    }
  });
});

describe('three-way navigation merge', () => {
  it('syncs the navigation direction field', () => {
    const baseline = extractNavigationSnapshot(cloneStructure());
    const entry = baseline.find((item) => item.direction !== 'down')!;
    const code = baseline.map((item) => item.id === entry.id ? { ...item, direction: 'down' as const } : item);
    const result = mergeNavigationChanges({ baseline, code, current: cloneStructure() });

    expect(result.conflicts).toEqual([]);
    expect(result.changed).toBe(true);
    expect(extractNavigationSnapshot(result.data).find((item) => item.id === entry.id)?.direction).toBe('down');
  });
  it('applies a VS Code-only edit and preserves unrelated Admin content', () => {
    const baselineStructure = cloneStructure();
    const baseline = extractNavigationSnapshot(baselineStructure);
    const entry = baseline[0]!;
    const code = baseline.map((item) => item.id === entry.id
      ? { ...item, yaw: adjustedYaw(item), target: item.target }
      : item);
    const current = cloneStructure();
    current.scenes[0]!.description.en = 'Content edited in Admin';

    const result = mergeNavigationChanges({ baseline, code, current });

    expect(result.conflicts).toEqual([]);
    expect(result.changed).toBe(true);
    expect(result.changes.updated).toEqual([entry.id]);
    expect(extractNavigationSnapshot(result.data).find((item) => item.id === entry.id)?.yaw)
      .toBe(adjustedYaw(entry));
    expect(result.data.scenes[0]!.description.en).toBe('Content edited in Admin');
  });

  it('preserves an Admin-only edit when VS Code is unchanged', () => {
    const baseline = extractNavigationSnapshot(cloneStructure());
    const entry = baseline[0]!;
    const current = cloneStructure();
    replaceNavigationEntry(current, { ...entry, yaw: adjustedYaw(entry, 2) });

    const result = mergeNavigationChanges({ baseline, code: baseline, current });

    expect(result.conflicts).toEqual([]);
    expect(result.changed).toBe(false);
    expect(extractNavigationSnapshot(result.data).find((item) => item.id === entry.id)?.yaw)
      .toBe(adjustedYaw(entry, 2));
  });

  it('accepts the same edit on both sides and lets the baseline advance without a write', () => {
    const baseline = extractNavigationSnapshot(cloneStructure());
    const entry = baseline[0]!;
    const changed = { ...entry, yaw: adjustedYaw(entry) };
    const code = baseline.map((item) => item.id === entry.id ? changed : item);
    const current = cloneStructure();
    replaceNavigationEntry(current, changed);

    const result = mergeNavigationChanges({ baseline, code, current });

    expect(result.conflicts).toEqual([]);
    expect(result.codeChangedIds).toContain(entry.id);
    expect(result.changed).toBe(false);
  });

  it('reports a conflict without returning partially modified data', () => {
    const baseline = extractNavigationSnapshot(cloneStructure());
    const entry = baseline[0]!;
    const code = baseline.map((item) => item.id === entry.id
      ? { ...item, yaw: adjustedYaw(item) }
      : item);
    const current = cloneStructure();
    replaceNavigationEntry(current, { ...entry, yaw: adjustedYaw(entry, 2) });

    const result = mergeNavigationChanges({ baseline, code, current });

    expect(result.conflicts.map((conflict) => conflict.id)).toEqual([entry.id]);
    expect(result.changed).toBe(false);
    expect(result.data).toEqual(current);
  });

  it('supports adding, deleting, and moving arrows by hotspot ID', () => {
    const baseline = extractNavigationSnapshot(cloneStructure());
    const deleted = baseline[0]!;
    const moved = baseline[1]!;
    const differentScene = cloneStructure().scenes.find((scene) => (
      scene.id !== moved.sceneId && scene.id !== moved.target
    ))!.id;
    const code = baseline
      .filter((entry) => entry.id !== deleted.id)
      .map((entry) => entry.id === moved.id ? { ...entry, sceneId: differentScene } : entry)
      .concat({
        id: 'new-code-arrow',
        sceneId: moved.sceneId,
        target: moved.target,
        yaw: 45,
        pitch: -3
      });

    const result = mergeNavigationChanges({ baseline, code, current: cloneStructure() });

    expect(result.conflicts).toEqual([]);
    expect(result.changes.added).toEqual(['new-code-arrow']);
    expect(result.changes.deleted).toEqual([deleted.id]);
    expect(result.changes.moved).toEqual([moved.id]);
    expect(tourStructureDataSchema.safeParse(result.data).success).toBe(true);
  });

  it('detects a newly introduced one-way route but ignores an existing warning', () => {
    const before = cloneStructure();
    before.scenes[0]!.hotspots.push({
      id: 'existing-one-way', type: 'scene', target: before.scenes[2]!.id, yaw: 20, pitch: -3
    });
    const afterExistingOnly = structuredClone(before);
    afterExistingOnly.scenes[0]!.title.en = 'Unrelated content change';
    expect(findNewNavigationIssues(before, afterExistingOnly)).toEqual([]);

    const after = structuredClone(before);
    after.scenes[1]!.hotspots.push({
      id: 'new-one-way', type: 'scene', target: after.scenes[3]!.id, yaw: 30, pitch: -3
    });
    expect(findNewNavigationIssues(before, after).some((message) => message.includes('new-one-way') || message.length > 0))
      .toBe(true);
  });
});

describe('tour structure signatures', () => {
  it('is stable for equivalent data and changes when yaw changes without a version bump', () => {
    const left = cloneStructure();
    const right = cloneStructure();
    expect(getTourStructureDataSignature(left)).toBe(getTourStructureDataSignature(right));
    const entry = extractNavigationSnapshot(right)[0]!;
    replaceNavigationEntry(right, { ...entry, yaw: adjustedYaw(entry) });
    expect(getTourStructureDataSignature(left)).not.toBe(getTourStructureDataSignature(right));
    expect(navigationSnapshotsEqual(extractNavigationSnapshot(left), extractNavigationSnapshot(right))).toBe(false);
  });
});
